/**
 * 전화 우선순위 (WO §8.3, PRD R-121, DECISIONS PC-5).
 *
 *   priority = 관심 구직자 수(희망 지역·업종 일치, S·A 가중) × 2 + 인구감소지역 가점 + 신규성 가점
 *
 * - "관심 구직자" = 등급 S·A, 트랙 JOB_MATCH, 구직 상태 ACTIVE인 구직자(BR-06 노출 대상과 같은 범위,
 *   BR-07 FUTURE_POOL 제외) 중 희망 지역에 리드의 시·도(또는 "어디든 가능")가 있고 희망 업종에 리드의
 *   업종이 있는 사람. 업종을 모르는 리드(진단 리드 등)는 일치 0명으로 본다.
 * - 가중치·가점은 `LEAD_PRIORITY_WEIGHTS`(src/config/limits.ts, 운영자 조정 값)에서만 읽는다.
 * - "대기 인력 n명" = 일치 구직자 수(가중치 없음).
 * - 신규성: 게시일(postedAt, 없으면 수집일 createdAt)이 `newLeadDays`일 이내.
 */
import type { LeadGrade, Prisma, SeekerGrade } from "@prisma/client";

import { LEAD_PRIORITY_WEIGHTS } from "@/config/limits";
import { db } from "@/lib/db";
import { ANY_REGION } from "@/lib/seeker/options";

const DAY_MS = 86_400_000;

export type PrioritySeeker = {
  grade: SeekerGrade;
  desiredRegions: string[];
  desiredIndustries: string[];
};

export type PriorityLead = {
  sido: string;
  industryCode: string | null;
  depopulationArea: boolean;
  postedAt: Date | null;
  createdAt: Date;
};

export type LeadPriority = {
  priority: number;
  /** "대기 인력 n명" */
  waiting: number;
  parts: { match: number; depopulation: number; newness: number };
};

export type PriorityWeights = {
  seekerGrade: Readonly<Partial<Record<SeekerGrade, number>>>;
  matchMultiplier: number;
  depopulationBonus: number;
  newLeadBonus: number;
  newLeadDays: number;
};

/** Seekers that count for the priority (S·A, JOB_MATCH, ACTIVE). */
export const PRIORITY_SEEKER_WHERE: Prisma.SeekerProfileWhereInput = {
  grade: { in: ["S", "A"] },
  track: "JOB_MATCH",
  status: "ACTIVE",
};

export function seekerMatchesLead(seeker: PrioritySeeker, lead: PriorityLead): boolean {
  if (!lead.industryCode) return false;
  const region =
    seeker.desiredRegions.includes(lead.sido) || seeker.desiredRegions.includes(ANY_REGION);
  return region && seeker.desiredIndustries.includes(lead.industryCode);
}

export function leadPriority(
  lead: PriorityLead,
  seekers: readonly PrioritySeeker[],
  now: Date,
  weights: PriorityWeights = LEAD_PRIORITY_WEIGHTS,
): LeadPriority {
  let weighted = 0;
  let waiting = 0;
  for (const s of seekers) {
    const w = weights.seekerGrade[s.grade] ?? 0;
    if (w <= 0 || !seekerMatchesLead(s, lead)) continue;
    waiting += 1;
    weighted += w;
  }
  const match = weighted * weights.matchMultiplier;
  const depopulation = lead.depopulationArea ? weights.depopulationBonus : 0;
  const since = (lead.postedAt ?? lead.createdAt).getTime();
  const fresh = now.getTime() - since <= weights.newLeadDays * DAY_MS;
  const newness = fresh ? weights.newLeadBonus : 0;
  return {
    priority: match + depopulation + newness,
    waiting,
    parts: { match, depopulation, newness },
  };
}

/** Default lead order (R-121): priority descending; ties → newer lead first, then id. */
export function sortByPriority<T extends { priority: number; createdAt: Date; id: string }>(
  rows: readonly T[],
): T[] {
  return [...rows].sort(
    (a, b) =>
      b.priority - a.priority ||
      b.createdAt.getTime() - a.createdAt.getTime() ||
      a.id.localeCompare(b.id),
  );
}

/** Grades that are still worked by phone (priority is meaningful). */
export const CALLABLE_LEAD_GRADES: readonly LeadGrade[] = ["C", "B", "A"];

type SeekerReader = { seekerProfile: { findMany: typeof db.seekerProfile.findMany } };

/** Loads the seekers that count for the priority (no encrypted field is selected). */
export async function loadPrioritySeekers(
  client: SeekerReader = db,
  scope?: Prisma.SeekerProfileWhereInput,
): Promise<PrioritySeeker[]> {
  return client.seekerProfile.findMany({
    where: scope ? { AND: [PRIORITY_SEEKER_WHERE, scope] } : PRIORITY_SEEKER_WHERE,
    select: { grade: true, desiredRegions: true, desiredIndustries: true },
  });
}
