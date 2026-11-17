/**
 * 미계약·미검증 기업용 후보 요약 통계 (WO §9.3 "아니면 요약 통계만", PRD R-205, R-218,
 * DECISIONS PC-11).
 *
 * Counts of eligible candidates (the same query rule as the list) per 시·도 × 등급, plus the total.
 * Cells with fewer than `CANDIDATE_STATS_MIN_SAMPLE` seekers are masked (count `null`), the same
 * rule as the demand map (WO §15-10), and the total is hidden whenever a cell is masked
 * (`maskCandidateStats`). No seeker row, id or field leaves this module.
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

/**
 * Why the total is hidden: `HAS_MASKED_CELL` = at least one cell is masked, so total − (visible
 * cells) would give the masked value back (PC-11 차감 노출); `SMALL` = no cell is masked but the
 * total is under the minimum (in practice: no candidate at all).
 */
export type CandidateStatsTotalMask = "SMALL" | "HAS_MASKED_CELL";

export type CandidateStats = {
  /** null = hidden (see `totalMask`). */
  total: number | null;
  totalMask: CandidateStatsTotalMask | null;
  cells: CandidateStatCell[];
  minSample: number;
};

export type CandidateStatGroup = { sido: string | null; grade: "S" | "A"; n: number };

/**
 * PC-11 masking of the summary (pure, unit-tested). A cell under `minSample` is masked. The table
 * has one sum only (the overall total — no row or column sums), and that total is published only
 * when no cell is masked: a sum over a masked cell is never shown, so no sum minus public cells
 * can give a masked value back. Chosen over secondary masking (also hiding the next-smallest
 * cell) because it hides one number instead of more cells, and needs no cell-selection rule.
 */
export function maskCandidateStats(
  groups: readonly CandidateStatGroup[],
  minSample: number = CANDIDATE_STATS_MIN_SAMPLE,
): CandidateStats {
  const total = groups.reduce((sum, g) => sum + g.n, 0);
  const cells = groups
    .map(({ sido, grade, n }) => ({ sido, grade, count: n < minSample ? null : n }))
    // larger cells first, masked cells last; S before A; then the region code. The order uses the
    // published count only, so it does not rank masked cells against each other either.
    .sort(
      (a, b) =>
        (b.count ?? 0) - (a.count ?? 0) ||
        (a.grade === b.grade ? 0 : a.grade === "S" ? -1 : 1) ||
        (a.sido ?? "").localeCompare(b.sido ?? ""),
    );
  // A masked cell decides first: telling "under the minimum" apart from "hidden" would itself say
  // whether the masked cells add up to less than the minimum.
  const totalMask: CandidateStatsTotalMask | null = cells.some((c) => c.count === null)
    ? "HAS_MASKED_CELL"
    : total < minSample
      ? "SMALL"
      : null;
  return { total: totalMask ? null : total, totalMask, cells, minSample };
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
  // The total is the sum of the published cells only (eligible rows are S or A anyway).
  return maskCandidateStats(
    groups
      .filter((g): g is typeof g & { grade: "S" | "A" } => g.grade === "S" || g.grade === "A")
      .map((g) => ({ sido: g.sido, grade: g.grade, n: g._count._all })),
  );
}
