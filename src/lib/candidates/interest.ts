/**
 * 면접 요청 (PRD R-207; WO §9.3 버튼; BR-01; STANDARD 1.1 면접 요청 = InterestRequest(EMPLOYER)).
 *
 * A verified, contracted company asks for an interview with one blind candidate. The request goes
 * to VISA n JOB, never to the seeker (BR-01): it creates
 * - one InterestRequest(initiator EMPLOYER, status RECEIVED) for the seeker and the company, and
 * - one StaffTask INTEREST_FOLLOWUP for the placement staff (dedupe key per company + seeker, so a
 *   second click or a double submit never creates a second request),
 * and then alerts the staff through the NotificationProvider. The payload and the alert carry ids
 * only. The result carries no seeker data at all — not even the seeker's database id.
 * The seeker must still be eligible (the list may be stale: revoked BLIND_PROFILE, grade change …).
 * There is no "지원하기" (SC-06) and no contact exchange here; the real name is handed over only
 * after the seeker's per-interview consent (R-211, P2c).
 */
import { Prisma } from "@prisma/client";

import type { Locale } from "@/i18n/locales";
import { db } from "@/lib/db";
import { getNotificationProvider, type NotificationProvider } from "@/lib/notifications";
import { fromBlindPublicId, toBlindPublicId } from "@/lib/serializers/blindSeeker";

import { candidateAccessOf } from "./access";
import { eligibleCandidateWhere } from "./eligible";

type Client = typeof db;

/** Notification template id of the staff alert (rendered by the staff channel, not messages/*). */
export const EMPLOYER_INTEREST_STAFF_TEMPLATE = "staff.employerInterviewRequest";
/** The staff role that follows up 면접 요청 (매칭 담당, WO §11). */
export const EMPLOYER_INTEREST_ASSIGNEE_ROLE = "STAFF_PLACEMENT" as const;

export function employerInterestDedupeKey(companyId: string, seekerId: string): string {
  return `INTEREST_FOLLOWUP:EMPLOYER:${companyId}:${seekerId}`;
}

export type EmployerInterestResult =
  { ok: true; already: boolean } | { ok: false; code: "NOT_CONTRACTED" | "NOT_FOUND" };

export async function requestCandidateInterview(
  args: {
    actor: { id: string; companyId: string };
    /** Blind public id as the employer saw it. */
    publicId: string;
    locale: Locale;
    now?: Date;
    provider?: NotificationProvider;
  },
  client: Client = db,
): Promise<EmployerInterestResult> {
  const now = args.now ?? new Date();
  const { companyId } = args.actor;
  const access = await candidateAccessOf(companyId, client);
  if (access.level !== "LIST") return { ok: false, code: "NOT_CONTRACTED" };
  const uuid = fromBlindPublicId(args.publicId);
  if (!uuid) return { ok: false, code: "NOT_FOUND" };
  const seeker = await client.seekerProfile.findFirst({
    where: { AND: [eligibleCandidateWhere(now), { publicId: uuid }] },
    select: { id: true },
  });
  if (!seeker) return { ok: false, code: "NOT_FOUND" };

  let taskId: string;
  try {
    taskId = await client.$transaction(async (tx) => {
      // The unique dedupe key is taken first: a concurrent second request fails here (P2002).
      const task = await tx.staffTask.create({
        data: {
          type: "INTEREST_FOLLOWUP",
          assigneeRole: EMPLOYER_INTEREST_ASSIGNEE_ROLE,
          seekerId: seeker.id,
          companyId,
          dueAt: now,
          dedupeKey: employerInterestDedupeKey(companyId, seeker.id),
          payload: { initiator: "EMPLOYER" },
        },
        select: { id: true },
      });
      const request = await tx.interestRequest.create({
        data: {
          initiator: "EMPLOYER",
          seekerId: seeker.id,
          companyId,
          status: "RECEIVED",
          createdAt: now,
        },
        select: { id: true },
      });
      await tx.staffTask.update({
        where: { id: task.id },
        data: { payload: { initiator: "EMPLOYER", interestRequestId: request.id } },
      });
      return task.id;
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
    to: `role:${EMPLOYER_INTEREST_ASSIGNEE_ROLE}`,
    templateKey: EMPLOYER_INTEREST_STAFF_TEMPLATE,
    locale: args.locale,
    params: { taskId, companyId },
  });
  return { ok: true, already: false };
}

/** Blind ids (as the employer sees them) this company already asked about, for the button state. */
export async function requestedPublicIds(
  companyId: string,
  client: Client = db,
): Promise<Set<string>> {
  const rows = await client.interestRequest.findMany({
    where: { companyId, initiator: "EMPLOYER" },
    select: { seeker: { select: { publicId: true } } },
  });
  return new Set(rows.map((r) => toBlindPublicId(r.seeker.publicId)));
}
