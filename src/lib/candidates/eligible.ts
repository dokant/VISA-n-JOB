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
import { notExpiredFrom } from "@/lib/visa-engine/classifyTrack";

/** Grades shown to employers (WO §7.6). */
export const EMPLOYER_VISIBLE_GRADES = ["S", "A"] as const;

/**
 * Employer-visible seekers at `now`. A seeker whose stay expiry month is over is excluded at once
 * (Q-11, P1c QA O-1: the expiry may be changed after registration in /me/stay); no expiry stored is
 * not "expired" (the wizard requires one before completion).
 */
export function eligibleCandidateWhere(now: Date = new Date()): Prisma.SeekerProfileWhereInput {
  return {
    grade: { in: [...EMPLOYER_VISIBLE_GRADES] },
    track: "JOB_MATCH",
    status: "ACTIVE",
    completedStep: { gte: WIZARD_LAST_STEP },
    OR: [{ stayExpiry: null }, { stayExpiry: { gte: notExpiredFrom(now) } }],
    user: { consents: { some: { type: "BLIND_PROFILE", revokedAt: null } } },
  };
}

/** Ids of eligible seekers (optionally narrowed by `where`). No personal data is selected. */
export async function eligibleCandidateIds(
  where: Prisma.SeekerProfileWhereInput = {},
  now: Date = new Date(),
): Promise<string[]> {
  const rows = await db.seekerProfile.findMany({
    where: { AND: [eligibleCandidateWhere(now), where] },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/** True when one seeker currently passes the employer-visibility rule. */
export async function isEligibleCandidate(
  seekerId: string,
  now: Date = new Date(),
): Promise<boolean> {
  const count = await db.seekerProfile.count({
    where: { AND: [eligibleCandidateWhere(now), { id: seekerId }] },
  });
  return count > 0;
}
