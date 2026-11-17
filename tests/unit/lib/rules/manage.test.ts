/**
 * R-215 규칙 DB·점수표 관리: versions DRAFT → PUBLISHED → RETIRED.
 * - DRAFT (and RETIRED) versions are never used by the public calculations: /visa-check
 *   (runVisaCheck → evaluate.ts), the employer 무료 채용 진단 (runDiagnosis) and the E-7-4 calculator.
 * - Publishing records reviewedBy / reviewedAt, retires the previous PUBLISHED version of the same
 *   rule (table) and writes AuditLog RULE_PUBLISH; seed SAMPLE versions cannot be published (BR-12).
 * All values below are obvious test dummies (codes "TEST…", 0 / 1 points) — no legal value (BR-12).
 * Score tables published here are never named E-7-4, so the public calculator and e74.test.ts are not
 * affected by this file.
 */
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { runDiagnosis } from "@/lib/employer/diagnosis";
import {
  createScoreTable,
  createVisaRule,
  newScoreTableVersion,
  newVisaRuleVersion,
  publishScoreTable,
  publishVisaRule,
  retireScoreTable,
  retireVisaRule,
  updateScoreTableDraft,
  updateVisaRuleDraft,
} from "@/lib/rules/manage";
import { isRuleMessageKey, ruleMessageOptions } from "@/lib/rules/messageKeys";
import { getPublishedE74Table, scoreE74 } from "@/lib/score/e74";
import { NEEDS_REVIEW_MESSAGE_KEY } from "@/lib/visa-engine/constants";
import { diagnosisSchema } from "@/schemas/employer/diagnosis";
import { runVisaCheck } from "@/server/actions/visa/evaluateVisa";

import { TEST_TAG_NOTE, uniq } from "../../db/helpers";
import { auditRows, staffUser } from "../admin/adminFixtures";
import { seededRefs } from "../employer/employerFixtures";

afterAll(() => db.$disconnect());

const SAMPLE_MESSAGE = "visa.rule.sample.placeholder";

/** An active, non-status VisaType only this test uses (never offered on a screen). */
async function testVisa(): Promise<string> {
  const code = uniq("TESTVISA")
    .replace(/[^A-Za-z0-9_-]/g, "-")
    .slice(0, 40);
  await db.visaType.create({
    data: {
      code,
      nameKey: "visaType.other.name",
      registrable: false,
      isStatusCode: false,
      active: true,
      sortOrder: 9999,
      note: TEST_TAG_NOTE,
    },
  });
  return code;
}

function ruleInput(visaCode: string, over: Partial<Parameters<typeof createVisaRule>[0]> = {}) {
  return {
    visaCode,
    industryCode: null,
    outcome: "GREEN" as const,
    messageKey: SAMPLE_MESSAGE,
    conditions: "{}",
    ...over,
  };
}

const ITEMS = JSON.stringify({
  items: [
    {
      key: "dummyA",
      label: "TEST 항목",
      bands: [
        { key: "a0", label: "TEST 0", points: 0 },
        { key: "a1", label: "TEST 1", points: 1 },
      ],
    },
  ],
});

describe("R-215 rules", () => {
  it("message keys: only keys present in all six locales (visa.rule.* and 행정사 확인 필요)", () => {
    const keys = ruleMessageOptions().map((o) => o.key);
    expect(keys).toContain(NEEDS_REVIEW_MESSAGE_KEY);
    expect(keys).toContain(SAMPLE_MESSAGE);
    expect(isRuleMessageKey("visa.rule.nothing.here")).toBe(false);
    expect(isRuleMessageKey("common.otp.sms")).toBe(false);
  });

  it("DRAFT is not used by /visa-check; 게시 records reviewedBy/At + RULE_PUBLISH; a new version retires the old one; 폐기 stops it", async () => {
    const visa = await testVisa();
    const staff = await staffUser("STAFF_VISA");
    const check = () => runVisaCheck({ visaCode: visa });

    const created = await createVisaRule(ruleInput(visa));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    // DRAFT: the public check ignores it
    expect(await check()).toMatchObject({
      status: "ok",
      outcome: "YELLOW",
      messageKey: NEEDS_REVIEW_MESSAGE_KEY,
    });

    const now = new Date("2026-12-02T03:04:05.000Z");
    const published = await publishVisaRule({ actorId: staff.id, id: created.id, now });
    expect(published).toEqual({ ok: true, retiredIds: [] });
    expect(await db.visaRule.findUniqueOrThrow({ where: { id: created.id } })).toMatchObject({
      status: "PUBLISHED",
      reviewedBy: staff.id,
      reviewedAt: now,
      version: 1,
    });
    expect(await check()).toMatchObject({ outcome: "GREEN", messageKey: SAMPLE_MESSAGE });
    expect((await auditRows(created.id, "RULE_PUBLISH")).map((a) => [a.actorId, a.meta])).toEqual([
      [staff.id, { change: "PUBLISH", version: 1, retiredIds: [] }],
    ]);
    // a published version cannot be edited or published again
    expect(await updateVisaRuleDraft(created.id, ruleInput(visa, { outcome: "RED" }))).toEqual({
      ok: false,
      code: "NOT_DRAFT",
    });
    expect(await publishVisaRule({ actorId: staff.id, id: created.id })).toEqual({
      ok: false,
      code: "NOT_DRAFT",
    });

    // v2 DRAFT (RED): v1 still decides
    const v2 = await newVisaRuleVersion(created.id);
    expect(v2.ok).toBe(true);
    if (!v2.ok) return;
    expect(await newVisaRuleVersion(created.id)).toEqual({ ok: false, code: "DRAFT_EXISTS" });
    expect(await updateVisaRuleDraft(v2.id, ruleInput(visa, { outcome: "RED" }))).toEqual({
      ok: true,
    });
    expect(await check()).toMatchObject({ outcome: "GREEN" });
    const draft2 = await db.visaRule.findUniqueOrThrow({ where: { id: v2.id } });
    expect(draft2).toMatchObject({
      version: 2,
      status: "DRAFT",
      reviewedBy: null,
      reviewedAt: null,
    });

    // publishing v2 retires v1 in the same step
    expect(await publishVisaRule({ actorId: staff.id, id: v2.id })).toEqual({
      ok: true,
      retiredIds: [created.id],
    });
    expect((await db.visaRule.findUniqueOrThrow({ where: { id: created.id } })).status).toBe(
      "RETIRED",
    );
    expect(await check()).toMatchObject({ outcome: "RED" });
    expect(
      await db.visaRule.count({ where: { ruleKey: draft2.ruleKey, status: "PUBLISHED" } }),
    ).toBe(1);

    // 폐기: back to "행정사 확인 필요", audited
    expect(await retireVisaRule({ actorId: staff.id, id: v2.id })).toEqual({ ok: true });
    expect(await retireVisaRule({ actorId: staff.id, id: v2.id })).toEqual({
      ok: false,
      code: "NOT_PUBLISHED",
    });
    expect(await check()).toMatchObject({
      outcome: "YELLOW",
      messageKey: NEEDS_REVIEW_MESSAGE_KEY,
    });
    expect((await auditRows(v2.id, "RULE_PUBLISH")).map((a) => a.meta)).toEqual([
      { change: "PUBLISH", version: 2, retiredIds: [created.id] },
      { change: "RETIRE", version: 2 },
    ]);
  });

  it("DRAFT rules are not used by the employer 무료 채용 진단 either", async () => {
    const refs = await seededRefs();
    const judged = await db.visaType.findFirstOrThrow({
      where: { active: true, isStatusCode: true, registrable: true },
      orderBy: { sortOrder: "asc" },
    });
    const draft = await createVisaRule(ruleInput(judged.code, { outcome: "GREEN" }));
    expect(draft.ok).toBe(true);
    const r = await runDiagnosis(
      diagnosisSchema.parse({
        industryCode: refs.industryCode,
        sido: refs.sido,
        sigungu: refs.sigungu,
        regularEmployees: "25",
        insuredDomestic: "20",
        foreignWorkers: [],
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const group = r.result.groups.find((g) => g.visas.some((v) => v.code === judged.code));
    expect(group).toMatchObject({ outcome: "YELLOW", messageKey: NEEDS_REVIEW_MESSAGE_KEY });
  });

  it("refuses unknown references, bad JSON, and publishing a SAMPLE version (BR-12)", async () => {
    const visa = await testVisa();
    const staff = await staffUser("STAFF_VISA");
    expect(await createVisaRule(ruleInput("NO-SUCH-VISA"))).toEqual({
      ok: false,
      code: "UNKNOWN_VISA",
    });
    expect(await createVisaRule(ruleInput(visa, { industryCode: "NOPE" }))).toEqual({
      ok: false,
      code: "UNKNOWN_INDUSTRY",
    });
    expect(await createVisaRule(ruleInput(visa, { messageKey: "visa.rule.made.up" }))).toEqual({
      ok: false,
      code: "UNKNOWN_MESSAGE_KEY",
    });
    expect(await createVisaRule(ruleInput(visa, { conditions: "{not json" }))).toEqual({
      ok: false,
      code: "INVALID_JSON",
    });
    expect(await createVisaRule(ruleInput(visa, { conditions: '{"all":[{"op":"eq"}]}' }))).toEqual({
      ok: false,
      code: "INVALID_SHAPE",
    });

    // a version that still carries the SAMPLE marker
    const sample = await createVisaRule(
      ruleInput(visa, { conditions: '{"__sample":true,"all":[]}' }),
    );
    expect(sample.ok).toBe(true);
    if (!sample.ok) return;
    expect((await db.visaRule.findUniqueOrThrow({ where: { id: sample.id } })).isSample).toBe(true);
    expect(await publishVisaRule({ actorId: staff.id, id: sample.id })).toEqual({
      ok: false,
      code: "SAMPLE_NOT_PUBLISHABLE",
    });
    // the seeded SAMPLE rows stay unpublishable; a new version of one is a SAMPLE draft too
    const seeded = await db.visaRule.findFirstOrThrow({ where: { id: "sample-rule-1" } });
    expect(seeded).toMatchObject({ status: "DRAFT", isSample: true });
    expect(await publishVisaRule({ actorId: staff.id, id: seeded.id })).toEqual({
      ok: false,
      code: "SAMPLE_NOT_PUBLISHABLE",
    });
    // removing the marker (a person entered real values) makes the draft publishable
    expect(await updateVisaRuleDraft(sample.id, ruleInput(visa))).toEqual({ ok: true });
    expect((await publishVisaRule({ actorId: staff.id, id: sample.id })).ok).toBe(true);
  });
});

describe("R-215 score tables", () => {
  it("DRAFT E-7-4 tables are not used by the calculator; the seed SAMPLE draft is edited, not duplicated", async () => {
    // the seed SAMPLE E-7-4 draft is the one to fill in: a second E-7-4 draft is refused
    expect(await createScoreTable({ name: "E-7-4", passScore: 1, items: ITEMS })).toEqual({
      ok: false,
      code: "DRAFT_EXISTS",
    });
    // a complete, valid E-7-4 table that is still DRAFT (high version) is ignored by the calculator
    const draft = await db.scoreTable.create({
      data: {
        name: "E-7-4",
        version: 9_000 + Math.floor(Math.random() * 900),
        items: JSON.parse(ITEMS) as object,
        passScore: 1,
        status: "DRAFT",
        isSample: false,
      },
    });
    const published = await getPublishedE74Table();
    expect(published?.id).not.toBe(draft.id);
    const r = await scoreE74({ dummyA: "a1" });
    if (r.status === "READY") expect(r.tableId).not.toBe(draft.id);
    const seed = await db.scoreTable.findUniqueOrThrow({ where: { id: "sample-score-e74-1" } });
    expect(seed).toMatchObject({ status: "DRAFT", isSample: true });
    const staff = await staffUser("STAFF_VISA");
    expect(await publishScoreTable({ actorId: staff.id, id: seed.id })).toEqual({
      ok: false,
      code: "SAMPLE_NOT_PUBLISHABLE",
    });
  });

  it("versions per name: publish records reviewedBy/At and retires the previous one; 폐기 audited", async () => {
    const name = `TEST-${Date.now().toString(36)}`.slice(0, 20);
    const staff = await staffUser("ADMIN");
    const v1 = await createScoreTable({ name, passScore: null, items: ITEMS });
    expect(v1.ok).toBe(true);
    if (!v1.ok) return;
    expect(await createScoreTable({ name, passScore: null, items: ITEMS })).toEqual({
      ok: false,
      code: "DRAFT_EXISTS",
    });
    expect(await updateScoreTableDraft(v1.id, { passScore: 1, items: "[]" })).toEqual({
      ok: false,
      code: "INVALID_JSON",
    });
    const now = new Date("2026-12-03T00:00:00.000Z");
    expect(await publishScoreTable({ actorId: staff.id, id: v1.id, now })).toEqual({
      ok: true,
      retiredIds: [],
    });
    expect(await db.scoreTable.findUniqueOrThrow({ where: { id: v1.id } })).toMatchObject({
      status: "PUBLISHED",
      reviewedBy: staff.id,
      reviewedAt: now,
    });

    const v2 = await newScoreTableVersion(v1.id);
    expect(v2.ok).toBe(true);
    if (!v2.ok) return;
    expect(await db.scoreTable.findUniqueOrThrow({ where: { id: v2.id } })).toMatchObject({
      name,
      version: 2,
      status: "DRAFT",
    });
    expect(await publishScoreTable({ actorId: staff.id, id: v2.id })).toEqual({
      ok: true,
      retiredIds: [v1.id],
    });
    expect((await db.scoreTable.findUniqueOrThrow({ where: { id: v1.id } })).status).toBe(
      "RETIRED",
    );
    expect(await retireScoreTable({ actorId: staff.id, id: v2.id })).toEqual({ ok: true });
    expect((await auditRows(v2.id, "RULE_PUBLISH")).map((a) => a.meta)).toEqual([
      { change: "PUBLISH", version: 2, retiredIds: [v1.id] },
      { change: "RETIRE", version: 2 },
    ]);
  });
});
