/**
 * PC-11 (P2b run 2): no combination of the published numbers gives a masked cell back.
 *
 * The summary publishes the cells (`count`, null = masked) and one sum, the overall total (there
 * are no row or column sums). `maskCandidateStats` hides the total whenever a cell is masked. The
 * check is exhaustive over small tables: for every table, changing the values of the masked cells
 * (anything from 1 to minSample − 1) leaves the published output unchanged, cell order included —
 * so no sum, difference, ordering or other formula over the published value can tell what a masked
 * cell holds.
 */
import { describe, expect, it } from "vitest";

import { type CandidateStatGroup, maskCandidateStats } from "@/lib/candidates/stats";

const MIN = 5;
const CELLS: Omit<CandidateStatGroup, "n">[] = [
  { sido: "SEOUL", grade: "S" },
  { sido: "SEOUL", grade: "A" },
  { sido: "BUSAN", grade: "S" },
  { sido: null, grade: "A" },
];
/** Values tried per cell: masked (1~4) and public (5, 6, 9). 0 = no row (the cell is absent). */
const VALUES = [0, 1, 2, 4, 5, 6, 9];

function* tables(): Generator<number[]> {
  const idx = CELLS.map(() => 0);
  for (;;) {
    yield idx.map((i) => VALUES[i]);
    let k = 0;
    while (k < idx.length && ++idx[k] === VALUES.length) idx[k++] = 0;
    if (k === idx.length) return;
  }
}

const groupsOf = (ns: number[]): CandidateStatGroup[] =>
  CELLS.flatMap((c, i) => (ns[i] > 0 ? [{ ...c, n: ns[i] }] : []));

/** The whole published value, cell order included (the order must not rank masked cells). */
const published = (ns: number[]) => maskCandidateStats(groupsOf(ns), MIN);

describe("PC-11 candidate stats: masked cells cannot be derived", () => {
  it("a cell under the minimum is masked, and the total is hidden whenever a cell is", () => {
    for (const ns of tables()) {
      const out = maskCandidateStats(groupsOf(ns), MIN);
      const anyMasked = out.cells.some((c) => c.count === null);
      for (const c of out.cells) {
        const n = ns[CELLS.findIndex((x) => x.sido === c.sido && x.grade === c.grade)];
        expect(c.count).toBe(n < MIN ? null : n);
      }
      if (anyMasked) {
        expect(out.total).toBeNull();
      } else {
        // no masked cell: the total is just the sum of the public cells (nothing new)
        const sum = ns.reduce((a, b) => a + b, 0);
        expect(out.total).toBe(sum >= MIN ? sum : null);
      }
    }
  });

  it("the published output does not depend on the values inside masked cells", () => {
    let compared = 0;
    for (const ns of tables()) {
      const masked = ns.map((n, i) => (n > 0 && n < MIN ? i : -1)).filter((i) => i >= 0);
      if (masked.length === 0) continue;
      const base = published(ns);
      // every other value 1..MIN-1 in each masked cell → the same published numbers
      for (const i of masked) {
        for (let v = 1; v < MIN; v++) {
          const other = [...ns];
          other[i] = v;
          expect(published(other)).toEqual(base);
          compared += 1;
        }
      }
      // all masked cells changed together as well
      const all = [...ns];
      for (const i of masked) all[i] = MIN - all[i];
      expect(published(all)).toEqual(base);
    }
    expect(compared).toBeGreaterThan(1000);
  });

  it("example from the QA report: total − visible cells no longer gives the masked cell", () => {
    const out = maskCandidateStats(
      [
        { sido: "SEOUL", grade: "A", n: 201 },
        { sido: "SEOUL", grade: "S", n: 10 },
        { sido: "BUSAN", grade: "S", n: 3 },
      ],
      MIN,
    );
    expect(out.cells.map((c) => c.count)).toEqual([201, 10, null]);
    expect(out.total).toBeNull();
    expect(out.totalMask).toBe("HAS_MASKED_CELL");
  });
});
