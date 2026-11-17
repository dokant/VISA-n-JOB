/**
 * R-124 무료 채용 진단 / WO15-09: with no PUBLISHED rule the result is YELLOW + "행정사 확인 필요";
 * a published rule decides only through evaluate.ts; every run is saved as a lead.
 */
import type { VisaRule } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { DIAGNOSIS_CONTEXT, groupResults, runDiagnosis } from "@/lib/employer/diagnosis";
import { NEEDS_REVIEW_MESSAGE_KEY } from "@/lib/visa-engine/evaluate";
import { diagnosisSchema } from "@/schemas/employer/diagnosis";

import { testPrisma } from "../../db/helpers";
import { createEmployer, seededRefs } from "./employerFixtures";

const prisma = testPrisma();
afterAll(() => prisma.$disconnect());

async function values(over: Record<string, unknown> = {}) {
  const refs = await seededRefs();
  return diagnosisSchema.parse({
    industryCode: refs.industryCode,
    sido: refs.sido,
    sigungu: refs.sigungu,
    regularEmployees: "25",
    insuredDomestic: "20",
    foreignWorkers: [],
    ...over,
  });
}

/** The real db, with `visaRule.findMany` answering the given (test-only, dummy) rules. */
function withRules(rules: VisaRule[]): typeof db {
  return new Proxy(db, {
    get(target, prop) {
      if (prop === "visaRule") return { findMany: async () => rules };
      const value = Reflect.get(target, prop) as unknown;
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

describe("R-124 runDiagnosis", () => {
  it("WO15-09 R-124: no PUBLISHED rule → every visa YELLOW + 행정사 확인 필요", async () => {
    const r = await runDiagnosis(await values());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.needsReview).toBe(true);
    expect(r.result.groups).toHaveLength(1);
    expect(r.result.groups[0]).toMatchObject({
      outcome: "YELLOW",
      messageKey: NEEDS_REVIEW_MESSAGE_KEY,
    });
    // the listed visas come from VisaType data (active, 체류자격 code, registrable)
    const expected = await prisma.visaType.findMany({
      where: { active: true, isStatusCode: true, registrable: true },
      orderBy: { sortOrder: "asc" },
      select: { code: true },
    });
    expect(r.result.groups[0].visas.map((v) => v.code)).toEqual(expected.map((v) => v.code));
  });

  it("seeded SAMPLE (DRAFT) rules are never used", async () => {
    const samples = await prisma.visaRule.count({ where: { isSample: true, status: "DRAFT" } });
    expect(samples).toBeGreaterThan(0);
    const r = await runDiagnosis(await values());
    if (!r.ok) throw new Error("unexpected");
    expect(r.result.groups.every((g) => g.outcome === "YELLOW")).toBe(true);
  });

  it("a test-only PUBLISHED dummy rule decides its visa through evaluate.ts facts", async () => {
    const visa = await prisma.visaType.findFirstOrThrow({
      where: { active: true, isStatusCode: true, registrable: true },
      orderBy: { sortOrder: "asc" },
    });
    const rule: VisaRule = {
      id: "dummy-rule",
      ruleKey: "dummy-rule",
      visaCode: visa.code,
      industryCode: null,
      // dummy condition on the diagnosis facts (not a legal value — BR-12)
      conditions: {
        all: [
          { field: "context", op: "eq", value: DIAGNOSIS_CONTEXT },
          { field: "regularEmployees", op: "gte", value: 999_999 },
        ],
      },
      outcome: "GREEN",
      messageKey: "visa.rule.test.dummy",
      version: 1,
      status: "PUBLISHED",
      isSample: true,
      reviewedBy: null,
      reviewedAt: null,
      createdAt: new Date(),
    };
    const hit = await runDiagnosis(
      await values({ regularEmployees: "999999" }),
      {},
      withRules([rule]),
    );
    if (!hit.ok) throw new Error("unexpected");
    expect(hit.result.groups[0]).toMatchObject({
      outcome: "GREEN",
      messageKey: "visa.rule.test.dummy",
    });
    expect(hit.result.groups[0].visas.map((v) => v.code)).toEqual([visa.code]);
    expect(hit.result.groups[1]).toMatchObject({ outcome: "YELLOW" });

    const miss = await runDiagnosis(await values({ regularEmployees: "3" }), {}, withRules([rule]));
    if (!miss.ok) throw new Error("unexpected");
    expect(miss.result.groups.map((g) => g.outcome)).toEqual(["YELLOW"]);
  });

  it("saves an anonymous run as a new C lead without company name / title / contact", async () => {
    // The lead is identified by its id, not by a global DIAGNOSIS count: other test files create
    // DIAGNOSIS leads in parallel on the shared test DB (flaky count, seen in P2c run 3).
    const r = await runDiagnosis(
      await values({ foreignWorkers: [{ visaCode: "E-9", count: "3" }] }),
    );
    if (!r.ok) throw new Error("unexpected");
    expect(await prisma.jobLead.count({ where: { id: r.leadId, source: "DIAGNOSIS" } })).toBe(1);
    const lead = await prisma.jobLead.findUniqueOrThrow({ where: { id: r.leadId } });
    const refs = await seededRefs();
    expect(lead).toMatchObject({
      grade: "C",
      companyId: null,
      companyName: null,
      title: null,
      contactPhoneEnc: null,
      sido: refs.sido,
      sigungu: refs.sigungu,
      depopulationArea: refs.depopulationArea,
      industryCode: refs.industryCode,
    });
    expect(lead.sourceRef).toMatch(/^DIAGNOSIS:/);
    expect(lead.diagnosisJson).toMatchObject({
      needsReview: true,
      answers: { regularEmployees: 25, foreignWorkers: [{ visaCode: "E-9", count: 3 }] },
    });
  });

  it("a signed-in company keeps one diagnosis lead; an archived one comes back to C with audit", async () => {
    const actor = await createEmployer();
    const first = await runDiagnosis(await values(), {
      companyId: actor.companyId,
      actorId: actor.id,
    });
    const second = await runDiagnosis(await values({ regularEmployees: "40" }), {
      companyId: actor.companyId,
      actorId: actor.id,
    });
    if (!first.ok || !second.ok) throw new Error("unexpected");
    expect(second.leadId).toBe(first.leadId);
    expect(await prisma.jobLead.count({ where: { companyId: actor.companyId } })).toBe(1);

    await prisma.jobLead.update({
      where: { id: first.leadId },
      data: { grade: "ARCHIVED", archivedAt: new Date() },
    });
    await runDiagnosis(await values(), { companyId: actor.companyId, actorId: actor.id });
    const lead = await prisma.jobLead.findUniqueOrThrow({ where: { id: first.leadId } });
    expect(lead.grade).toBe("C");
    const logs = await prisma.auditLog.findMany({ where: { entityId: first.leadId } });
    expect(logs.map((l) => l.meta)).toEqual([
      { from: "ARCHIVED", to: "C", reason: "DIAGNOSIS_REPEATED" },
    ]);
    expect(logs[0].actorId).toBe(actor.id);
  });

  it("refuses unknown reference codes and a 시·군·구 of another 시·도", async () => {
    const v = await values();
    const other = await prisma.region.findFirstOrThrow({
      where: { level: "SIDO", NOT: { code: v.sido } },
    });
    expect(await runDiagnosis({ ...v, sido: other.code })).toEqual({
      ok: false,
      code: "INVALID_REFERENCE",
    });
    expect(await runDiagnosis({ ...v, industryCode: "ZZ" })).toMatchObject({ ok: false });
    expect(
      await runDiagnosis({ ...v, foreignWorkers: [{ visaCode: "NOPE-1", count: 1 }] }),
    ).toMatchObject({ ok: false });
  });

  it("schema: counts are whole numbers, blank is required, a visa only once", () => {
    const base = {
      industryCode: "C",
      sido: "A",
      sigungu: "B",
      regularEmployees: "10",
      insuredDomestic: "8",
      foreignWorkers: [],
    };
    expect(diagnosisSchema.safeParse(base).success).toBe(true);
    const blank = diagnosisSchema.safeParse({ ...base, regularEmployees: "" });
    expect(blank.error?.issues[0].message).toBe("required");
    expect(diagnosisSchema.safeParse({ ...base, insuredDomestic: "1.5" }).success).toBe(false);
    expect(diagnosisSchema.safeParse({ ...base, insuredDomestic: "-1" }).success).toBe(false);
    const dup = diagnosisSchema.safeParse({
      ...base,
      foreignWorkers: [
        { visaCode: "X", count: "1" },
        { visaCode: "X", count: "2" },
      ],
    });
    expect(dup.error?.issues[0]).toMatchObject({
      message: "duplicateVisa",
      path: ["foreignWorkers", 1, "visaCode"],
    });
  });

  it("groupResults orders GREEN, YELLOW, RED and groups by message", () => {
    const v = { nameKey: "k", isStatusCode: true, ruleId: null };
    const groups = groupResults([
      { ...v, code: "A", outcome: "RED", messageKey: "m1" },
      { ...v, code: "B", outcome: "GREEN", messageKey: "m2" },
      { ...v, code: "C", outcome: "RED", messageKey: "m1" },
    ]);
    expect(groups.map((g) => [g.outcome, g.visas.map((x) => x.code)])).toEqual([
      ["GREEN", ["B"]],
      ["RED", ["A", "C"]],
    ]);
  });
});
