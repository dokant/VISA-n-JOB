/**
 * Interview disclosure serializer (PRD R-211 v1.1, DECISIONS PC-1, STANDARD 4.4 "면접 동의 후에도 기업
 * 응답에는 실명만").
 *
 * This is the ONLY place where anything beyond the blind profile (blindSeeker.ts) reaches an
 * employer, and it gives exactly one value: the seeker's real name, `legalName`. Never contacts —
 * phone, e-mail and messenger are not even selected (a VISA n JOB representative passes on what the
 * interview needs, BR-01).
 *
 * The name is returned only when ALL hold, checked in the query on every call (no caching):
 * - the interview belongs to a recommendation for the asking company (해당 기업),
 * - it is this interview (해당 면접 건) and its status is CONFIRMED (a cancelled or not yet confirmed
 *   interview gives nothing),
 * - the interview has not ended: no final result (채용·불합격·노쇼, `DISCLOSURE_ENDING_RESULTS`) has been
 *   recorded. The consent runs "이 면접 건이 끝날 때까지" (THIRD_PARTY_INTERVIEW v1), so recording the
 *   outcome or cancelling ends the name (DECISIONS Q-25). "결과 대기"(PENDING) does not end it.
 * - the seeker of that recommendation has an unrevoked THIRD_PARTY_INTERVIEW consent for this
 *   interview id (revoking hides the name on the next request — WO §11 동의 철회).
 * Every disclosure writes AuditLog PII_VIEW (field name only, BR-15).
 * The result is a NEW frozen object whose key set is `INTERVIEW_DISCLOSURE_FIELDS`; the R-206 leak
 * harness allows exactly this key, for consented interviews only (src/lib/employer/apiRegistry.ts
 * `EMPLOYER_NAME_DISCLOSURE`).
 */
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { INTERVIEW_CONSENT } from "@/lib/seeker/options";

type Client = typeof db;

export const INTERVIEW_DISCLOSURE_FIELDS = ["legalName"] as const;
export type InterviewDisclosureField = (typeof INTERVIEW_DISCLOSURE_FIELDS)[number];
export type InterviewDisclosure = { readonly [K in InterviewDisclosureField]: string };

/** Interview statuses in which a consented name is shown. */
export const DISCLOSABLE_INTERVIEW_STATUS = "CONFIRMED";

/**
 * Recorded interview results that end the interview (Q-25): the name is no longer given. Keep in step
 * with INTERVIEW_RESULTS (src/lib/recommendations/interviews.ts) — every value except PENDING.
 */
export const DISCLOSURE_ENDING_RESULTS = ["HIRED", "REJECTED", "NO_SHOW"] as const;

/** Whether an interview has ended for the name disclosure (Q-25): cancelled or a final result. */
export function interviewEnded(iv: { status: string; result: string | null }): boolean {
  return (
    iv.status === "CANCELLED" ||
    (iv.result !== null && (DISCLOSURE_ENDING_RESULTS as readonly string[]).includes(iv.result))
  );
}

export function assertDisclosureKeys(value: object): void {
  const keys = Object.keys(value);
  if (
    keys.length !== INTERVIEW_DISCLOSURE_FIELDS.length ||
    keys.some((k) => !(INTERVIEW_DISCLOSURE_FIELDS as readonly string[]).includes(k))
  ) {
    throw new Error("interviewDisclosure: key set differs from INTERVIEW_DISCLOSURE_FIELDS");
  }
}

/**
 * The disclosure of one interview for one company, or null. `actorId` is the employer user who sees
 * it (PII_VIEW actor).
 */
export async function loadInterviewDisclosure(
  args: { companyId: string; interviewId: string; actorId: string },
  client: Client = db,
): Promise<InterviewDisclosure | null> {
  const row = await client.interview.findFirst({
    where: {
      id: args.interviewId,
      status: DISCLOSABLE_INTERVIEW_STATUS,
      // Q-25: a recorded final result ends the 면접 건 (NULL kept explicitly: NOT IN drops NULLs).
      OR: [{ result: null }, { result: { notIn: [...DISCLOSURE_ENDING_RESULTS] } }],
      recommendation: { companyId: args.companyId },
      consents: { some: { type: INTERVIEW_CONSENT, revokedAt: null } },
    },
    select: {
      id: true,
      recommendation: {
        select: { seeker: { select: { userId: true, legalNameEnc: true } } },
      },
      consents: {
        where: { type: INTERVIEW_CONSENT, revokedAt: null },
        select: { userId: true },
      },
    },
  });
  if (!row) return null;
  const seeker = row.recommendation.seeker;
  // The consent must be the seeker's own (only the seeker can write it, checked again here).
  if (!row.consents.some((c) => c.userId === seeker.userId)) return null;
  const name = typeof seeker.legalNameEnc === "string" ? seeker.legalNameEnc.trim() : "";
  if (name === "") return null;

  await writeAudit(
    {
      actorId: args.actorId,
      action: "PII_VIEW",
      entity: "Interview",
      entityId: row.id,
      meta: { fields: ["legalName"], viewer: "EMPLOYER", companyId: args.companyId },
    },
    client,
  );
  const out: InterviewDisclosure = { legalName: name };
  assertDisclosureKeys(out);
  return Object.freeze(out);
}
