/**
 * Lead grade transitions (WO §8.2, R-115, R-116, R-125; BR-15 LEAD_GRADE_CHANGE).
 *
 *   C(수집) ──전화──▶ B(관심 확인) ──구인신청·검증──▶ A(공고 가능)
 *      │                 │
 *      └─30일 미접촉/마감─▶ ARCHIVED     └─의사 없음─▶ DO_NOT_CONTACT
 *
 * Rules written down here (PLAN P1d 작업 2):
 * - DO_NOT_CONTACT is final for every automatic path. Re-ingesting the same `sourceRef` keeps the
 *   grade (R-115: never back to C); a 구인 의뢰 from that company creates a new lead instead.
 * - Re-ingest never lowers or raises B / A, and keeps C as C.
 * - ARCHIVED on re-ingest: stays ARCHIVED unless the source shows the posting again after it was
 *   archived (`postedAt` later than `archivedAt`, i.e. re-posted) — then it returns to C.
 * - 구인 의뢰 (R-125) moves C or ARCHIVED to B.
 * - The archive job (R-116) moves only C to ARCHIVED (WO §8.2 arrow starts at C).
 * Every grade change writes one AuditLog row (LEAD_GRADE_CHANGE) in the same transaction.
 *
 * Re-ingest field rules (P1d QA O-2; applied in ingest.ts, any grade including DO_NOT_CONTACT):
 * - A key the item does not carry (absent or `undefined`) keeps the stored value. It is never
 *   overwritten with null.
 * - A key carried as explicit `null` (or blank text) means "the source has no value now" and
 *   clears the column to null. Required columns cannot be cleared: `companyName`, `title` sent as
 *   null make the item INVALID, and 시·도 is never cleared (see region below).
 * - A key carried with a value replaces the stored value.
 * - Derived columns follow their input keys as a group:
 *   - region (`sido`, `sigungu`, `depopulationArea`) from `sido` / `sigungu` / `address`: none
 *     carried → kept; any carried → re-tagged together; carried but no 시·도 found → the item is
 *     rejected UNKNOWN_REGION and the row is left unchanged.
 *   - `industryCode` from `industryCode` / `industryName`: none carried → kept; any carried →
 *     re-tagged (both null, or text the seed table does not know → null).
 *   - `contactPhoneHash` follows `contactPhone`. Each contact field (`contactName`,
 *     `contactPhone`, `contactEmail`) is handled on its own by the same three rules.
 * - `source` follows the same rule (a new lead without it takes the schema default AGENT).
 * - `rawJson` is always replaced by the latest item (it is the original of the last delivery).
 */
import type { LeadGrade, Prisma } from "@prisma/client";

import { type AuditWriter, writeAudit } from "@/lib/audit";

/** Allowed moves. Staff moves of P1e (call results, A after verification) are listed as well. */
export const LEAD_TRANSITIONS: Readonly<Record<LeadGrade, readonly LeadGrade[]>> = {
  C: ["B", "ARCHIVED", "DO_NOT_CONTACT"],
  B: ["A", "ARCHIVED", "DO_NOT_CONTACT"],
  A: ["ARCHIVED", "DO_NOT_CONTACT"],
  ARCHIVED: ["C", "B"],
  DO_NOT_CONTACT: [],
};

export function canTransition(from: LeadGrade, to: LeadGrade): boolean {
  return LEAD_TRANSITIONS[from].includes(to);
}

export class LeadTransitionError extends Error {
  readonly code = "LEAD_TRANSITION_INVALID";
  readonly status = 422;
  constructor(
    readonly from: LeadGrade,
    readonly to: LeadGrade,
  ) {
    super(`lead grade ${from} → ${to} is not allowed`);
    this.name = "LeadTransitionError";
  }
}

/** Grade after a re-ingest of an existing lead (rules above). */
export function gradeOnReingest(
  existing: { grade: LeadGrade; archivedAt: Date | null },
  incoming: { postedAt?: Date | null },
): LeadGrade {
  if (existing.grade !== "ARCHIVED") return existing.grade;
  const reposted =
    incoming.postedAt != null &&
    existing.archivedAt != null &&
    incoming.postedAt.getTime() > existing.archivedAt.getTime();
  return reposted ? "C" : "ARCHIVED";
}

export type LeadTransitionReason =
  | "INGEST_REPOSTED" // ARCHIVED → C on re-ingest
  | "ARCHIVE_NO_CONTACT" // R-116
  | "ARCHIVE_CLOSED" // R-116
  | "JOB_REQUEST" // R-125
  | "DIAGNOSIS_REPEATED" // R-124: a signed-in company runs the diagnosis again (ARCHIVED → C)
  | "CREATED" // a lead created directly at a grade above C (R-125 without an earlier lead)
  | "CALL_INTERESTED" // P1e R-121: 통화 결과 관심 있음 → B
  | "CALL_REQUEST_RECEIVED" // P1e R-121: 통화 중 구인신청 접수 → B
  | "CALL_DNC" // P1e R-121: 재접촉 거부 → DO_NOT_CONTACT
  | "CALL_NO_INTENT" // P1e R-121, Q-14 (WO §8.2 의사 없음): 고용 의사 없음 → DO_NOT_CONTACT
  | "STAFF_VERIFIED"; // P1e R-121: 구인신청 + 직원 검증 완료 → A (BR-05)

/** Anything with `jobLead.updateMany` + `auditLog.create` (the app db, a transaction client …). */
type TxClient = {
  jobLead: {
    updateMany(args: {
      where: Prisma.JobLeadWhereInput;
      data: Prisma.JobLeadUncheckedUpdateManyInput;
    }): PromiseLike<{ count: number }>;
  };
} & AuditWriter;

/**
 * Moves one lead from `from` to `to` (guarded: the row must still have `from`) and writes
 * LEAD_GRADE_CHANGE. Returns false when another process changed the grade first.
 * Call inside a transaction so the audit row commits with the change.
 */
export async function transitionLead(
  tx: TxClient,
  args: {
    leadId: string;
    from: LeadGrade;
    to: LeadGrade;
    actorId: string;
    reason: LeadTransitionReason;
    now: Date;
    data?: Prisma.JobLeadUncheckedUpdateManyInput;
  },
): Promise<boolean> {
  if (!canTransition(args.from, args.to)) throw new LeadTransitionError(args.from, args.to);
  const archivedAt =
    args.to === "ARCHIVED" ? args.now : args.from === "ARCHIVED" ? null : undefined;
  const { count } = await tx.jobLead.updateMany({
    where: { id: args.leadId, grade: args.from },
    data: { ...args.data, grade: args.to, ...(archivedAt !== undefined ? { archivedAt } : {}) },
  });
  if (count === 0) return false;
  await writeAudit(
    {
      actorId: args.actorId,
      action: "LEAD_GRADE_CHANGE",
      entity: "JobLead",
      entityId: args.leadId,
      meta: { from: args.from, to: args.to, reason: args.reason },
    },
    tx,
  );
  return true;
}

/** Audit row for a lead that is created directly above C (no earlier grade). */
export function auditLeadCreatedAt(
  tx: AuditWriter,
  args: { leadId: string; grade: LeadGrade; actorId: string; reason: LeadTransitionReason },
) {
  return writeAudit(
    {
      actorId: args.actorId,
      action: "LEAD_GRADE_CHANGE",
      entity: "JobLead",
      entityId: args.leadId,
      meta: { from: null, to: args.grade, reason: args.reason },
    },
    tx,
  );
}
