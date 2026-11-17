/**
 * E2E fixtures for the P2e integration scenario (R-217, WO §15-11). The seeker, the grade change, the
 * 면접 요청 and the recommendation are all made through the screens; this file only
 *
 * - tags the seeker for the employer list (an inactive, non-status VisaType code in
 *   `convertibleVisa`, same isolation as candidatesDb.createCandidate) so rows that earlier runs left
 *   in the shared development database never change what the test sees (the candidate list is
 *   filtered by `?convertible=<tag>`), and
 * - reads back what the server under test wrote.
 *
 * Local development database; unique values; nothing is deleted.
 */
import { db } from "@/lib/db";

import "./authDb"; // loads .env (DATABASE_URL, keys) for the fixtures below
import { e2eTag } from "./candidatesDb";

/** Registers a unique filter tag and puts it on the seeker (test isolation only, not a judgement). */
export async function tagForCandidateList(seekerId: string): Promise<string> {
  const tag = e2eTag();
  await db.visaType.create({
    data: {
      code: tag,
      nameKey: "visaType.other.name",
      registrable: false,
      isStatusCode: false,
      active: false,
      sortOrder: 9999,
      note: "E2E filter tag (P2e integration isolation), not a visa",
    },
  });
  await db.seekerProfile.update({ where: { id: seekerId }, data: { convertibleVisa: tag } });
  return tag;
}

/** The 면접 요청 rows (EMPLOYER initiator) of one company. */
export function interviewRequestsOf(companyId: string) {
  return db.interestRequest.findMany({
    where: { companyId, initiator: "EMPLOYER" },
    select: { id: true, seekerId: true, status: true },
  });
}

/** Recommendation ledger rows of one seeker (R-217: the row the scenario must end with). */
export function ledgerRowsOf(seekerId: string) {
  return db.recommendation.findMany({
    where: { seekerId },
    select: { id: true, companyId: true, postingId: true, staffId: true },
  });
}

/** AuditLog actions written about one entity, oldest first. */
export async function auditActionsOf(entityId: string): Promise<string[]> {
  const rows = await db.auditLog.findMany({
    where: { entityId },
    orderBy: { at: "asc" },
    select: { action: true },
  });
  return rows.map((r) => r.action);
}
