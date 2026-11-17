/**
 * R-205 / PC-11: the summary for companies without list access — eligible seekers only, per
 * 시·도 × 등급, cells under CANDIDATE_STATS_MIN_SAMPLE masked (same rule as the demand map, WO §15-10).
 * The shared test DB holds other rows, so a far-future clock (only fixture rows with a far expiry
 * are eligible then) isolates the counts.
 */
import { afterAll, describe, expect, it } from "vitest";

import { CANDIDATE_STATS_MIN_SAMPLE } from "@/config/limits";
import { candidateStats } from "@/lib/candidates/stats";
import { db } from "@/lib/db";

import { candidate, tag } from "./candidateFixtures";

afterAll(() => db.$disconnect());

describe("R-205 candidateStats (PC-11 masking)", () => {
  it("counts eligible seekers per 시·도 × 등급 and masks cells under the minimum", async () => {
    // A clock no other test uses: only seekers whose stay runs until then are eligible.
    const now = new Date(Date.UTC(2090, 0, 15, 3));
    const far = new Date(Date.UTC(2090, 5, 1));
    const t = tag("stats");
    const n = CANDIDATE_STATS_MIN_SAMPLE;
    for (let i = 0; i < n; i++) await candidate(t, { sido: "JEJU", grade: "A", stayExpiry: far });
    for (let i = 0; i < n - 1; i++) {
      await candidate(t, { sido: "ULSAN", grade: "S", stayExpiry: far });
    }
    // not eligible: E-9, grade B, revoked
    await candidate(t, { sido: "JEJU", visaCode: "E-9", track: "FUTURE_POOL", stayExpiry: far });
    await candidate(t, { sido: "JEJU", grade: "B", stayExpiry: far });
    await candidate(t, { sido: "JEJU", blindProfile: "REVOKED", stayExpiry: far });

    const stats = await candidateStats(now);
    expect(stats.minSample).toBe(n);
    // one cell is masked → the total is hidden too (total − JEJU would give ULSAN back, PC-11)
    expect(stats.total).toBeNull();
    expect(stats.totalMask).toBe("HAS_MASKED_CELL");
    expect(stats.cells).toEqual([
      { sido: "JEJU", grade: "A", count: n },
      { sido: "ULSAN", grade: "S", count: null },
    ]);
    // no seeker id, public id or field in the result
    expect(JSON.stringify(stats)).not.toMatch(/publicId|seekerId|legalName/);
  });

  it("a total under the minimum is masked as well", async () => {
    const now = new Date(Date.UTC(2095, 0, 15, 3));
    await candidate(tag("stats-small"), { stayExpiry: new Date(Date.UTC(2095, 3, 1)) });
    const stats = await candidateStats(now);
    expect(stats.total).toBeNull();
    expect(stats.totalMask).toBe("HAS_MASKED_CELL");
    expect(stats.cells.every((c) => c.count === null)).toBe(true);
  });

  it("the total is shown when no cell is masked", async () => {
    const now = new Date(Date.UTC(2097, 0, 15, 3));
    const far = new Date(Date.UTC(2097, 5, 1));
    const t = tag("stats-open");
    const n = CANDIDATE_STATS_MIN_SAMPLE;
    for (let i = 0; i < n; i++)
      await candidate(t, { sido: "GANGWON", grade: "S", stayExpiry: far });
    for (let i = 0; i < n + 1; i++) {
      await candidate(t, { sido: "GANGWON", grade: "A", stayExpiry: far });
    }
    const stats = await candidateStats(now);
    expect(stats.totalMask).toBeNull();
    expect(stats.total).toBe(2 * n + 1);
    expect(stats.cells).toEqual([
      { sido: "GANGWON", grade: "A", count: n + 1 },
      { sido: "GANGWON", grade: "S", count: n },
    ]);
  });
});
