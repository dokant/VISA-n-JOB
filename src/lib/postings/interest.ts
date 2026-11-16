/**
 * 면접 신청 (PRD R-203; WO §8.5 버튼; BR-01; STANDARD 1.1 면접 신청 = InterestRequest(SEEKER)).
 *
 * A signed-in seeker asks for an interview on a public posting. The request goes to the operator,
 * never to the company (BR-01): it creates
 * - one InterestRequest(initiator SEEKER, status RECEIVED) linked to the posting and its company
 *   (for staff follow-up; the company is not notified and gets no seeker data here), and
 * - one StaffTask INTEREST_FOLLOWUP for the placement staff (dedupe key per seeker + posting, so a
 *   second click or a double submit never creates a second request),
 * and then alerts the staff through the NotificationProvider (console adapter in development).
 * The payload and the alert carry ids only, never personal data.
 *
 * Eligibility (WO §8.5): the seeker's visa must be in the posting's `eligibleVisas` (operator data,
 * no visa list in code — BR-12). Otherwise the screen shows "상담 신청" instead, and the server
 * refuses with NOT_ELIGIBLE. A BLOCKED seeker is refused as well.
 */
import { Prisma } from "@prisma/client";

import type { Locale } from "@/i18n/locales";
import { db } from "@/lib/db";
import { getNotificationProvider, type NotificationProvider } from "@/lib/notifications";

import { PUBLIC_POSTING_WHERE } from "./public";

type Client = typeof db;

/** Notification template id of the staff alert (rendered by the staff channel, not messages/*). */
export const INTEREST_STAFF_TEMPLATE = "staff.interestRequest";
/** The staff role that follows up 면접 신청 (매칭 담당, WO §11). */
export const INTEREST_ASSIGNEE_ROLE = "STAFF_PLACEMENT" as const;

export function interestDedupeKey(seekerId: string, postingId: string): string {
  return `INTEREST_FOLLOWUP:SEEKER:${seekerId}:${postingId}`;
}

export type InterestState = "ELIGIBLE" | "NOT_ELIGIBLE" | "REQUESTED" | "BLOCKED";

type SeekerForInterest = { id: string; visaCode: string | null; status: string };

function stateOf(
  seeker: SeekerForInterest,
  eligibleVisas: readonly string[],
  requested: boolean,
): InterestState {
  if (requested) return "REQUESTED";
  if (seeker.status === "BLOCKED") return "BLOCKED";
  if (!seeker.visaCode || !eligibleVisas.includes(seeker.visaCode)) return "NOT_ELIGIBLE";
  return "ELIGIBLE";
}

/** What the posting screen shows to this signed-in seeker. Null when the user has no profile. */
export async function interestStateFor(
  args: { userId: string; postingId: string; eligibleVisas: readonly string[] },
  client: Client = db,
): Promise<InterestState | null> {
  const seeker = await client.seekerProfile.findUnique({
    where: { userId: args.userId },
    select: { id: true, visaCode: true, status: true },
  });
  if (!seeker) return null;
  const requested = await client.interestRequest.count({
    where: { seekerId: seeker.id, postingId: args.postingId, initiator: "SEEKER" },
  });
  return stateOf(seeker, args.eligibleVisas, requested > 0);
}

export type InterestResult =
  | { ok: true; interestRequestId: string; taskId: string; already: false }
  | { ok: true; already: true }
  | { ok: false; code: "NOT_FOUND" | "NO_PROFILE" | "NOT_ELIGIBLE" | "BLOCKED" };

/** R-203: creates the 면접 신청 and alerts the staff. */
export async function requestInterest(
  args: {
    userId: string;
    postingId: string;
    locale: Locale;
    now?: Date;
    provider?: NotificationProvider;
  },
  client: Client = db,
): Promise<InterestResult> {
  const now = args.now ?? new Date();
  const posting = await client.jobPosting.findFirst({
    where: { id: args.postingId, ...PUBLIC_POSTING_WHERE },
    select: { id: true, companyId: true, eligibleVisas: true },
  });
  if (!posting) return { ok: false, code: "NOT_FOUND" };
  const seeker = await client.seekerProfile.findUnique({
    where: { userId: args.userId },
    select: { id: true, visaCode: true, status: true },
  });
  if (!seeker) return { ok: false, code: "NO_PROFILE" };
  const state = stateOf(seeker, posting.eligibleVisas, false);
  if (state === "BLOCKED") return { ok: false, code: "BLOCKED" };
  if (state === "NOT_ELIGIBLE") return { ok: false, code: "NOT_ELIGIBLE" };

  let created: { interestRequestId: string; taskId: string };
  try {
    created = await client.$transaction(async (tx) => {
      // The unique dedupe key is taken first: a concurrent second request fails here (P2002).
      const task = await tx.staffTask.create({
        data: {
          type: "INTEREST_FOLLOWUP",
          assigneeRole: INTEREST_ASSIGNEE_ROLE,
          seekerId: seeker.id,
          companyId: posting.companyId,
          dueAt: now,
          dedupeKey: interestDedupeKey(seeker.id, posting.id),
          payload: { initiator: "SEEKER", postingId: posting.id },
        },
        select: { id: true },
      });
      const request = await tx.interestRequest.create({
        data: {
          initiator: "SEEKER",
          seekerId: seeker.id,
          postingId: posting.id,
          companyId: posting.companyId,
          status: "RECEIVED",
          createdAt: now,
        },
        select: { id: true },
      });
      await tx.staffTask.update({
        where: { id: task.id },
        data: {
          payload: { initiator: "SEEKER", postingId: posting.id, interestRequestId: request.id },
        },
      });
      return { interestRequestId: request.id, taskId: task.id };
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: true, already: true };
    }
    throw e;
  }

  // The task is the durable record; a failed alert leaves it OPEN on the staff task list.
  const provider = args.provider ?? getNotificationProvider();
  await provider.send({
    channel: "STAFF",
    to: `role:${INTEREST_ASSIGNEE_ROLE}`,
    templateKey: INTEREST_STAFF_TEMPLATE,
    locale: args.locale,
    params: { taskId: created.taskId, postingId: posting.id },
  });
  return { ok: true, already: false, ...created };
}
