/**
 * 미계약·미검증 기업용 후보 요약 통계 (WO §9.3 "아니면 요약 통계만", PRD R-205, R-218,
 * DECISIONS PC-11).
 *
 * Counts of eligible candidates (the same query rule as the list) per 시·도 × 등급, plus the total.
 * Cells with fewer than `CANDIDATE_STATS_MIN_SAMPLE` seekers are masked (count `null`), the same
 * rule as the demand map (WO §15-10). No seeker row, id or field leaves this module.
 */
import { CANDIDATE_STATS_MIN_SAMPLE } from "@/config/limits";
import { db } from "@/lib/db";

import { eligibleCandidateWhere } from "./eligible";

export type CandidateStatCell = {
  sido: string | null;
  grade: "S" | "A";
  /** null = masked (fewer than CANDIDATE_STATS_MIN_SAMPLE). */
  count: number | null;
};

export type CandidateStats = {
  /** null = masked. */
  total: number | null;
  cells: CandidateStatCell[];
  minSample: number;
};

function masked(n: number): number | null {
  return n < CANDIDATE_STATS_MIN_SAMPLE ? null : n;
}

export async function candidateStats(
  now: Date = new Date(),
  client: typeof db = db,
): Promise<CandidateStats> {
  const groups = await client.seekerProfile.groupBy({
    by: ["sido", "grade"],
    where: eligibleCandidateWhere(now),
    _count: { _all: true },
  });
  const total = groups.reduce((sum, g) => sum + g._count._all, 0);
  const cells = groups
    .filter((g): g is typeof g & { grade: "S" | "A" } => g.grade === "S" || g.grade === "A")
    .map((g) => ({ sido: g.sido, grade: g.grade, n: g._count._all }))
    // larger cells first; S before A; then the region code (stable order)
    .sort(
      (a, b) =>
        b.n - a.n ||
        (a.grade === b.grade ? 0 : a.grade === "S" ? -1 : 1) ||
        (a.sido ?? "").localeCompare(b.sido ?? ""),
    )
    .map(({ sido, grade, n }) => ({ sido, grade, count: masked(n) }));
  return { total: masked(total), cells, minSample: CANDIDATE_STATS_MIN_SAMPLE };
}
