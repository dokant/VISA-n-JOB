/**
 * R-117 / WO §8.4 / WO §15-10: demand aggregate — 30-day window, C·B·A only, 시·도 × 업종,
 * pay median band, cells below 5 masked ("자료 부족").
 */
import { afterAll, describe, expect, it } from "vitest";

import { DEMAND_MIN_SAMPLE, DEMAND_PAY_BAND_STEP_KRW, DEMAND_WINDOW_DAYS } from "@/config/limits";
import {
  type DemandLead,
  aggregateDemand,
  getDemandAggregate,
  median,
  payBandOf,
} from "@/lib/demand/aggregate";
import { DIAGNOSIS_SOURCE } from "@/lib/employer/diagnosis";
import { REQUEST_SOURCE } from "@/lib/employer/jobRequest";
import { INGEST_SOURCES } from "@/schemas/ingest/jobLead";

import { testPrisma, uniq } from "../../db/helpers";

const prisma = testPrisma();
afterAll(() => prisma.$disconnect());

const NOW = new Date("2026-11-16T00:00:00Z");
const DAY = 86_400_000;

function lead(partial: Partial<DemandLead> = {}): DemandLead {
  return {
    sido: "TEST_SIDO",
    industryCode: "C",
    payMin: 2_000_000,
    payMax: 2_400_000,
    grade: "C",
    postedAt: new Date(NOW.getTime() - DAY),
    createdAt: new Date(NOW.getTime() - DAY),
    ...partial,
  };
}

function many(n: number, partial: Partial<DemandLead> = {}): DemandLead[] {
  return Array.from({ length: n }, () => lead(partial));
}

describe("WO15-10 masking (R-117)", () => {
  it("a cell with fewer than the minimum sample is masked: no count, no pay", () => {
    const agg = aggregateDemand(many(DEMAND_MIN_SAMPLE - 1), NOW);
    expect(agg.cells).toEqual([
      { sido: "TEST_SIDO", industryCode: "C", masked: true, count: null, payBand: null },
    ]);
    expect(agg.bySido).toEqual([{ sido: "TEST_SIDO", masked: true, count: null, payBand: null }]);
  });

  it("a cell at the minimum sample is shown with count and pay band", () => {
    const agg = aggregateDemand(many(DEMAND_MIN_SAMPLE), NOW);
    expect(agg.cells[0]).toMatchObject({ masked: false, count: DEMAND_MIN_SAMPLE });
    expect(agg.cells[0].payBand).toEqual(payBandOf(2_200_000, DEMAND_PAY_BAND_STEP_KRW));
  });

  it("pay band is hidden when too few leads in a visible cell carry pay", () => {
    const leads = [...many(DEMAND_MIN_SAMPLE - 1), ...many(2, { payMin: null, payMax: null })];
    const cell = aggregateDemand(leads, NOW).cells[0];
    expect(cell.masked).toBe(false);
    expect(cell.payBand).toBeNull();
  });

  it("시·도 totals add only visible cells (masked counts cannot be recovered)", () => {
    const leads = [
      ...many(DEMAND_MIN_SAMPLE, { industryCode: "C" }),
      ...many(DEMAND_MIN_SAMPLE - 1, { industryCode: "F" }),
    ];
    const agg = aggregateDemand(leads, NOW, ["TEST_SIDO", "EMPTY_SIDO"]);
    expect(agg.bySido).toEqual([
      {
        sido: "TEST_SIDO",
        masked: false,
        count: DEMAND_MIN_SAMPLE,
        payBand: payBandOf(2_200_000, DEMAND_PAY_BAND_STEP_KRW),
      },
      { sido: "EMPTY_SIDO", masked: true, count: null, payBand: null },
    ]);
  });
});

describe("window and grades", () => {
  it("only leads within the window count; postedAt wins over createdAt", () => {
    const old = new Date(NOW.getTime() - (DEMAND_WINDOW_DAYS + 1) * DAY);
    const leads = [
      ...many(DEMAND_MIN_SAMPLE),
      ...many(3, { postedAt: old, createdAt: old }),
      ...many(3, { postedAt: old, createdAt: new Date(NOW.getTime() - DAY) }),
      ...many(2, { postedAt: null, createdAt: new Date(NOW.getTime() - DAY) }),
    ];
    expect(aggregateDemand(leads, NOW).cells[0].count).toBe(DEMAND_MIN_SAMPLE + 2);
  });

  it("ARCHIVED and DO_NOT_CONTACT leads are excluded; C·B·A included", () => {
    const leads = [
      lead({ grade: "C" }),
      lead({ grade: "B" }),
      lead({ grade: "A" }),
      lead({ grade: "A" }),
      lead({ grade: "B" }),
      ...many(3, { grade: "ARCHIVED" }),
      ...many(3, { grade: "DO_NOT_CONTACT" }),
    ];
    expect(aggregateDemand(leads, NOW).cells[0].count).toBe(5);
  });

  it("groups by 시·도 × 업종, leads without industry form their own cell", () => {
    const leads = [
      ...many(DEMAND_MIN_SAMPLE, { sido: "S1", industryCode: "C" }),
      ...many(DEMAND_MIN_SAMPLE, { sido: "S1", industryCode: null }),
      ...many(DEMAND_MIN_SAMPLE, { sido: "S2", industryCode: "C" }),
    ];
    const cells = aggregateDemand(leads, NOW).cells.map((c) => [c.sido, c.industryCode]);
    expect(cells).toEqual([
      ["S1", "C"],
      ["S1", null],
      ["S2", "C"],
    ]);
  });
});

describe("helpers", () => {
  it("median of odd and even lists", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
  it("pay band floors to the step", () => {
    expect(payBandOf(2_345_678, 100_000)).toEqual({ min: 2_300_000, max: 2_400_000 });
  });
});

describe("getDemandAggregate (database)", () => {
  it("WO15-10 aggregates leads from the database with masking", async () => {
    const sido = uniq("TESTSIDO");
    const now = new Date();
    const rows = Array.from({ length: DEMAND_MIN_SAMPLE + 2 }, (_, i) => ({
      source: "MANUAL",
      sourceRef: uniq("demand"),
      companyName: "TEST COMPANY",
      sido,
      industryCode: i < DEMAND_MIN_SAMPLE ? "C" : "F",
      title: "TEST",
      payMin: 2_000_000,
      payMax: 2_200_000,
      postedAt: new Date(now.getTime() - DAY),
      grade: "C" as const,
      rawJson: {},
    }));
    await prisma.jobLead.createMany({ data: rows });
    const agg = await getDemandAggregate(now, [sido]);
    const mine = agg.cells.filter((c) => c.sido === sido);
    expect(mine).toEqual([
      {
        sido,
        industryCode: "C",
        masked: false,
        count: DEMAND_MIN_SAMPLE,
        payBand: payBandOf(2_100_000, DEMAND_PAY_BAND_STEP_KRW),
      },
      { sido, industryCode: "F", masked: true, count: null, payBand: null },
    ]);
    expect(JSON.stringify(agg)).not.toContain("TEST COMPANY");
  });

  it("Q-12 counts collected postings only (WORK24_API / AGENT / MANUAL), not DIAGNOSIS / REQUEST", async () => {
    const sido = uniq("TESTSIDO");
    const now = new Date();
    const row = (source: string, industryCode: string) => ({
      source,
      sourceRef: uniq(`demand-${source}`),
      companyName: "TEST COMPANY",
      sido,
      industryCode,
      title: "TEST",
      payMin: 2_000_000,
      payMax: 2_200_000,
      postedAt: new Date(now.getTime() - DAY),
      grade: "B" as const,
      rawJson: {},
    });
    // C: one lead from each ingest source (masked: fewer than DEMAND_MIN_SAMPLE) plus enough
    // app-created leads that would unmask the cell if they were counted.
    // F: only app-created leads — the cell must not exist at all.
    const collected = INGEST_SOURCES.map((source) => row(source, "C"));
    const appMade = Array.from({ length: DEMAND_MIN_SAMPLE }, (_, i) => [
      row(i % 2 === 0 ? DIAGNOSIS_SOURCE : REQUEST_SOURCE, "C"),
      row(i % 2 === 0 ? REQUEST_SOURCE : DIAGNOSIS_SOURCE, "F"),
    ]).flat();
    await prisma.jobLead.createMany({ data: [...collected, ...appMade] });

    const agg = await getDemandAggregate(now, [sido]);
    const mine = agg.cells.filter((c) => c.sido === sido);
    expect(INGEST_SOURCES.length).toBeLessThan(DEMAND_MIN_SAMPLE);
    expect(mine).toEqual([{ sido, industryCode: "C", masked: true, count: null, payBand: null }]);
  });
});
