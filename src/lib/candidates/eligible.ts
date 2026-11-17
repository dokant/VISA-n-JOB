/**
 * Which seekers may ever appear to employers (BR-06, BR-07, R-113, STANDARD 4.4 "쿼리 계층").
 *
 * The rule is enforced in the query, not in the UI: grade S or A, track JOB_MATCH (E-9/E-10
 * FUTURE_POOL and CONSULT_ONLY never), status ACTIVE, an active job search status (P2b),
 * registration finished, a stay expiry month that is not over, and an unrevoked
 * BLIND_PROFILE consent. Revoking BLIND_PROFILE (/seeker/me) therefore removes the seeker from
 * every candidate query at once (WO §15-8). P2b builds the employer candidate list on top of
 * `eligibleCandidateWhere` and serializes rows only through `serializers/blindSeeker.ts`.
 */
import type { Prisma, ShiftOk } from "@prisma/client";

import { isStayBandCode, stayBandWhere } from "@/lib/candidates/stayBand";
import { db } from "@/lib/db";
import type { CandidateFilters } from "@/schemas/employer/candidates";
import { WIZARD_LAST_STEP } from "@/lib/seeker/options";
import { notExpiredFrom } from "@/lib/visa-engine/classifyTrack";

/** Grades shown to employers (WO §7.6). */
export const EMPLOYER_VISIBLE_GRADES = ["S", "A"] as const;

/**
 * BR-06 "구직 상태가 활성": the seeker is looking for work now or soon. NOT_SEARCHING (지금은 아님)
 * and an unanswered status are not shown to employers (P2b).
 */
export const ACTIVE_JOB_SEARCH_STATUSES = ["IMMEDIATE", "WITHIN_1M", "EMPLOYED_OPEN"] as const;

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
    jobSearchStatus: { in: [...ACTIVE_JOB_SEARCH_STATUSES] },
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

/**
 * WO §9.3 filters 8종 (R-205) as a where clause, applied on top of `eligibleCandidateWhere`.
 * Empty values add nothing. 한국어 = TOPIK 최소 급수, 경력 업종 = any experience row in that KSIC
 * section, 전환 가능 비자 = the scrivener's judgement `convertibleVisa`.
 */
export function candidateFilterWhere(
  filters: CandidateFilters,
  now: Date = new Date(),
): Prisma.SeekerProfileWhereInput {
  const and: Prisma.SeekerProfileWhereInput[] = [];
  if (filters.visa) and.push({ visaCode: filters.visa });
  if (isStayBandCode(filters.stay)) and.push(stayBandWhere(filters.stay, now));
  if (filters.topik) and.push({ topikLevel: { gte: Number(filters.topik) } });
  if (filters.industry) {
    and.push({ experiences: { some: { industryCode: filters.industry } } });
  }
  if (filters.skill) and.push({ skills: { has: filters.skill } });
  if (filters.dormitory) and.push({ needDormitory: filters.dormitory === "YES" });
  if (filters.shift) and.push({ shiftOk: filters.shift as ShiftOk });
  if (filters.convertible) and.push({ convertibleVisa: filters.convertible });
  return and.length > 0 ? { AND: and } : {};
}
