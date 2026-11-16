/**
 * Which seekers may ever appear to employers (BR-06, BR-07, R-113, STANDARD 4.4 "쿼리 계층").
 *
 * The rule is enforced in the query, not in the UI: grade S or A, track JOB_MATCH (E-9/E-10
 * FUTURE_POOL and CONSULT_ONLY never), status ACTIVE, registration finished, and an unrevoked
 * BLIND_PROFILE consent. Revoking BLIND_PROFILE (/seeker/me) therefore removes the seeker from
 * every candidate query at once (WO §15-8). P2b builds the employer candidate list on top of
 * `eligibleCandidateWhere` and serializes rows only through `serializers/blindSeeker.ts`.
 */
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { WIZARD_LAST_STEP } from "@/lib/seeker/options";

/** Grades shown to employers (WO §7.6). */
export const EMPLOYER_VISIBLE_GRADES = ["S", "A"] as const;

export function eligibleCandidateWhere(): Prisma.SeekerProfileWhereInput {
  return {
    grade: { in: [...EMPLOYER_VISIBLE_GRADES] },
    track: "JOB_MATCH",
    status: "ACTIVE",
    completedStep: { gte: WIZARD_LAST_STEP },
    user: { consents: { some: { type: "BLIND_PROFILE", revokedAt: null } } },
  };
}

/** Ids of eligible seekers (optionally narrowed by `where`). No personal data is selected. */
export async function eligibleCandidateIds(
  where: Prisma.SeekerProfileWhereInput = {},
): Promise<string[]> {
  const rows = await db.seekerProfile.findMany({
    where: { AND: [eligibleCandidateWhere(), where] },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/** True when one seeker currently passes the employer-visibility rule. */
export async function isEligibleCandidate(seekerId: string): Promise<boolean> {
  const count = await db.seekerProfile.count({
    where: { AND: [eligibleCandidateWhere(), { id: seekerId }] },
  });
  return count > 0;
}
