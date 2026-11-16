/**
 * R-127 / WO §10: e74.ts calculates only from a PUBLISHED score table and returns NOT_READY
 * otherwise. The PUBLISHED table below is a test-only dummy (DUMMY labels, arbitrary points) —
 * not a real E-7-4 criterion (BR-12).
 */
import { afterAll, describe, expect, it } from "vitest";

import {
  type ScoreTableRecord,
  calculateE74,
  getPublishedE74Table,
  localize,
  normalizeTableName,
  parseScoreTable,
  scoreE74,
} from "@/lib/score/e74";
import { REFERENCE_DISCLAIMER_KEY } from "@/lib/visa-engine/evaluate";

import { testPrisma } from "../../db/helpers";

const prisma = testPrisma();
afterAll(() => prisma.$disconnect());

const DUMMY_ITEMS = {
  items: [
    {
      key: "dummyA",
      label: { ko: "더미 항목 A", en: "Dummy item A" },
      bands: [
        { key: "a0", label: "DUMMY a0", points: 0 },
        { key: "a1", label: "DUMMY a1", points: 7 },
        { key: "a2", label: "DUMMY a2", points: 11 },
      ],
    },
    {
      key: "dummyB",
      label: "DUMMY B",
      bands: [
        { key: "b0", label: "DUMMY b0", points: 2 },
        { key: "b1", label: "DUMMY b1", points: 5 },
      ],
    },
    {
      key: "dummyC",
      label: "DUMMY C",
      bands: [{ key: "c0", label: "DUMMY c0", points: 3 }],
    },
  ],
};

function record(partial: Partial<ScoreTableRecord> = {}): ScoreTableRecord {
  return {
    id: "dummy-table",
    name: "E-7-4",
    version: 1,
    items: DUMMY_ITEMS,
    passScore: 15,
    status: "PUBLISHED",
    ...partial,
  };
}

describe("parseScoreTable", () => {
  it("accepts a PUBLISHED E-7-4 table", () => {
    expect(parseScoreTable(record())?.items).toHaveLength(3);
  });
  it.each([
    ["DRAFT", record({ status: "DRAFT" })],
    ["RETIRED", record({ status: "RETIRED" })],
    ["other name", record({ name: "DUMMY-TABLE" })],
    ["broken JSON", record({ items: { items: [{ key: "x", bands: [] }] } })],
  ])("rejects %s", (_label, r) => {
    expect(parseScoreTable(r)).toBeNull();
  });
  it("name matching ignores punctuation and case", () => {
    expect(normalizeTableName("e-7-4")).toBe(normalizeTableName("E74"));
  });
});

describe("calculateE74 (R-127 result format)", () => {
  const table = parseScoreTable(record());
  if (!table) throw new Error("dummy table must parse");

  it("returns total, per-item points, shortfalls and the reference disclaimer", () => {
    const r = calculateE74(table, { dummyA: "a1", dummyB: "b1", dummyC: "c0" });
    expect(r.status).toBe("READY");
    expect(r.total).toBe(7 + 5 + 3);
    expect(r.maxTotal).toBe(11 + 5 + 3);
    expect(r.items.map((i) => [i.key, i.points, i.maxPoints])).toEqual([
      ["dummyA", 7, 11],
      ["dummyB", 5, 5],
      ["dummyC", 3, 3],
    ]);
    expect(r.shortfalls.map((s) => [s.key, s.gap])).toEqual([["dummyA", 4]]);
    expect(r.passScore).toBe(15);
    expect(r.passed).toBe(true);
    expect(r.disclaimerKey).toBe(REFERENCE_DISCLAIMER_KEY);
  });

  it("missing or unknown answers score 0 and are listed as shortfalls (largest gap first)", () => {
    const r = calculateE74(table, { dummyA: "nope" });
    expect(r.total).toBe(0);
    expect(r.passed).toBe(false);
    expect(r.shortfalls.map((s) => s.key)).toEqual(["dummyA", "dummyB", "dummyC"]);
    expect(r.items[0].bandKey).toBeNull();
  });

  it("passed is null when the table has no pass score", () => {
    const noPass = parseScoreTable(record({ passScore: null }));
    expect(noPass && calculateE74(noPass, {}).passed).toBeNull();
  });
});

describe("localize", () => {
  it("picks locale, then ko, then first value", () => {
    expect(localize({ ko: "가", en: "A" }, "en")).toBe("A");
    expect(localize({ ko: "가", en: "A" }, "vi")).toBe("가");
    expect(localize({ en: "A" }, "vi")).toBe("A");
    expect(localize("plain", "en")).toBe("plain");
  });
});

describe("database (R-127)", () => {
  it("seed state: the SAMPLE table is DRAFT → NOT_READY (준비 중)", async () => {
    const drafts = await prisma.scoreTable.findMany({ where: { status: "DRAFT" } });
    expect(drafts.length).toBeGreaterThan(0);
    // No other test publishes an E-7-4 table before this assertion.
    expect(await getPublishedE74Table()).toBeNull();
    expect(await scoreE74({})).toEqual({ status: "NOT_READY" });
  });

  it("uses the latest PUBLISHED table once one exists (test-only dummy)", async () => {
    await prisma.scoreTable.create({
      data: {
        name: "E-7-4",
        version: 900,
        items: DUMMY_ITEMS,
        passScore: 15,
        status: "PUBLISHED",
        isSample: true,
      },
    });
    const r = await scoreE74({ dummyA: "a2", dummyB: "b0" });
    expect(r.status).toBe("READY");
    if (r.status === "READY") {
      expect(r.version).toBe(900);
      expect(r.total).toBe(11 + 2);
    }
  });
});
