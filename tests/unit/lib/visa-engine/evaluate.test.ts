/**
 * R-126 / WO §10 / BR-11: evaluate.ts uses PUBLISHED rules only and falls back to YELLOW +
 * "행정사 확인 필요". All rule values here are obvious test dummies (TEST-* codes, dummy fields) —
 * never real legal criteria (BR-12).
 */
import { afterAll, describe, expect, it } from "vitest";

import {
  NEEDS_REVIEW_MESSAGE_KEY,
  REFERENCE_DISCLAIMER_KEY,
  type VisaRuleRecord,
  evaluate,
  evaluateConditions,
  evaluateRules,
} from "@/lib/visa-engine/evaluate";
import { ruleConditionsSchema } from "@/schemas/visa/ruleConditions";

import { testPrisma, uniq } from "../../db/helpers";

const prisma = testPrisma();
afterAll(() => prisma.$disconnect());

function rule(partial: Partial<VisaRuleRecord> & { id: string }): VisaRuleRecord {
  return {
    visaCode: "TEST-A",
    industryCode: null,
    conditions: {},
    outcome: "GREEN",
    messageKey: "visa.rule.test.dummy",
    version: 1,
    status: "PUBLISHED",
    ...partial,
  };
}

describe("evaluateRules (pure)", () => {
  it("R-126 no rules → YELLOW + needs review + reference disclaimer", () => {
    const r = evaluateRules({ visaCode: "TEST-A" }, []);
    expect(r).toEqual({
      outcome: "YELLOW",
      messageKey: NEEDS_REVIEW_MESSAGE_KEY,
      ruleId: null,
      matched: false,
      disclaimerKey: REFERENCE_DISCLAIMER_KEY,
    });
  });

  it("ignores DRAFT and RETIRED rules", () => {
    const r = evaluateRules({ visaCode: "TEST-A" }, [
      rule({ id: "d", status: "DRAFT", outcome: "GREEN" }),
      rule({ id: "r", status: "RETIRED", outcome: "RED" }),
    ]);
    expect(r.outcome).toBe("YELLOW");
    expect(r.matched).toBe(false);
  });

  it("uses a matching PUBLISHED rule and always carries the disclaimer", () => {
    const r = evaluateRules({ visaCode: "TEST-A" }, [rule({ id: "p", outcome: "RED" })]);
    expect(r).toMatchObject({ outcome: "RED", ruleId: "p", matched: true });
    expect(r.disclaimerKey).toBe(REFERENCE_DISCLAIMER_KEY);
  });

  it("only rules of the same visa code apply", () => {
    const r = evaluateRules({ visaCode: "TEST-B" }, [rule({ id: "p" })]);
    expect(r.matched).toBe(false);
  });

  it("industry-specific rule wins over a generic one; other industries are skipped", () => {
    const rules = [
      rule({ id: "generic", outcome: "YELLOW", messageKey: "visa.rule.test.generic" }),
      rule({ id: "ind-x", industryCode: "X", outcome: "GREEN" }),
      rule({ id: "ind-y", industryCode: "Y", outcome: "RED" }),
    ];
    expect(evaluateRules({ visaCode: "TEST-A", industryCode: "X" }, rules).ruleId).toBe("ind-x");
    expect(evaluateRules({ visaCode: "TEST-A", industryCode: "Z" }, rules).ruleId).toBe("generic");
    expect(evaluateRules({ visaCode: "TEST-A" }, rules).ruleId).toBe("generic");
  });

  it("higher version wins among equally specific rules", () => {
    const r = evaluateRules({ visaCode: "TEST-A" }, [
      rule({ id: "v1", version: 1, outcome: "RED" }),
      rule({ id: "v2", version: 2, outcome: "GREEN" }),
    ]);
    expect(r.ruleId).toBe("v2");
  });

  it("conditions decide whether a rule matches; unmatched → needs review", () => {
    const conditions = {
      all: [
        { field: "dummyLevel", op: "gte", value: 3 },
        { field: "sido", op: "in", value: ["TEST_SIDO"] },
      ],
    };
    const rules = [rule({ id: "c", conditions })];
    expect(
      evaluateRules({ visaCode: "TEST-A", sido: "TEST_SIDO", facts: { dummyLevel: 4 } }, rules)
        .matched,
    ).toBe(true);
    const miss = evaluateRules(
      { visaCode: "TEST-A", sido: "TEST_SIDO", facts: { dummyLevel: 1 } },
      rules,
    );
    expect(miss).toMatchObject({ outcome: "YELLOW", messageKey: NEEDS_REVIEW_MESSAGE_KEY });
  });

  it("invalid conditions JSON never matches", () => {
    const r = evaluateRules({ visaCode: "TEST-A" }, [
      rule({ id: "bad", conditions: { all: [{ field: "", op: "nope" }] } }),
    ]);
    expect(r.matched).toBe(false);
  });
});

describe("evaluateConditions operators", () => {
  const parse = (c: unknown) => ruleConditionsSchema.parse(c);
  const facts = { s: "a", n: 5, b: true, empty: "" };

  it.each([
    [{ all: [{ field: "s", op: "eq", value: "a" }] }, true],
    [{ all: [{ field: "s", op: "neq", value: "a" }] }, false],
    [{ all: [{ field: "s", op: "in", value: ["a", "b"] }] }, true],
    [{ all: [{ field: "s", op: "notIn", value: ["a"] }] }, false],
    [{ all: [{ field: "s", op: "exists" }] }, true],
    [{ all: [{ field: "empty", op: "exists" }] }, false],
    [{ all: [{ field: "missing", op: "notExists" }] }, true],
    [{ all: [{ field: "n", op: "gt", value: 4 }] }, true],
    [{ all: [{ field: "n", op: "lt", value: 5 }] }, false],
    [{ all: [{ field: "n", op: "lte", value: 5 }] }, true],
    [{ all: [{ field: "s", op: "gte", value: 1 }] }, false],
    [
      {
        any: [
          { field: "s", op: "eq", value: "x" },
          { field: "b", op: "eq", value: true },
        ],
      },
      true,
    ],
    [{ not: { field: "s", op: "eq", value: "a" } }, false],
    [{ all: [{ any: [{ not: { field: "n", op: "eq", value: 1 } }] }] }, true],
    [{ __sample: true }, true],
  ])("%j → %s", (conditions, expected) => {
    expect(evaluateConditions(parse(conditions), facts)).toBe(expected);
  });
});

describe("evaluate (database)", () => {
  it("WO15-09 seed state (SAMPLE rules are DRAFT) → YELLOW 행정사 확인 필요", async () => {
    const seeded = await prisma.visaRule.findMany();
    expect(seeded.length).toBeGreaterThan(0);
    for (const r of seeded) {
      const result = await evaluate({ visaCode: r.visaCode, industryCode: r.industryCode });
      expect(result.outcome).toBe("YELLOW");
      expect(result.messageKey).toBe(NEEDS_REVIEW_MESSAGE_KEY);
    }
  });

  it("R-126 a test-only PUBLISHED dummy rule is used", async () => {
    const visaCode = uniq("TEST-VISA");
    const created = await prisma.visaRule.create({
      data: {
        visaCode,
        conditions: { all: [{ field: "industryCode", op: "eq", value: "TEST_IND" }] },
        outcome: "GREEN",
        messageKey: "visa.rule.test.dummy",
        version: 1,
        status: "PUBLISHED",
        isSample: true,
      },
    });
    const hit = await evaluate({ visaCode, industryCode: "TEST_IND" });
    expect(hit).toMatchObject({ outcome: "GREEN", ruleId: created.id, matched: true });
    const miss = await evaluate({ visaCode, industryCode: "OTHER_IND" });
    expect(miss.outcome).toBe("YELLOW");
  });
});
