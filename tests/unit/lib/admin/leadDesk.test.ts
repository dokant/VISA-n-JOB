/**
 * R-121: "등급 전이 시 AuditLog, 기본 정렬이 priority 내림차순 테스트" — call results move lead
 * grades (INTERESTED→B, DNC→DO_NOT_CONTACT, 구인신청·검증→A) with LEAD_GRADE_CHANGE each time.
 */
import { afterAll, describe, expect, it } from "vitest";

import { LEAD_PRIORITY_WEIGHTS } from "@/config/limits";
import { buildLeadBoard, gradeAfterCall, recordLeadCall, verifyLead } from "@/lib/admin/leadDesk";
import { db } from "@/lib/db";

import { uniq } from "../../db/helpers";
import { DAY_MS, auditRows, lead, seeker, staffUser } from "./adminFixtures";

afterAll(() => db.$disconnect());

async function gradeOf(id: string) {
  return (await db.jobLead.findUniqueOrThrow({ where: { id } })).grade;
}

describe("R-121 call result → lead grade", () => {
  it("R-121: gradeAfterCall table", () => {
    expect(gradeAfterCall("C", "INTERESTED")).toBe("B");
    expect(gradeAfterCall("ARCHIVED", "INTERESTED")).toBe("B");
    expect(gradeAfterCall("B", "INTERESTED")).toBeNull();
    expect(gradeAfterCall("C", "REQUEST_RECEIVED")).toBe("B");
    expect(gradeAfterCall("A", "REQUEST_RECEIVED")).toBeNull();
    for (const g of ["C", "B", "A", "ARCHIVED"] as const) {
      expect(gradeAfterCall(g, "DNC")).toBe("DO_NOT_CONTACT");
      expect(gradeAfterCall(g, "NO_ANSWER")).toBeNull();
      expect(gradeAfterCall(g, "NO_INTENT")).toBeNull();
    }
    expect(gradeAfterCall("DO_NOT_CONTACT", "INTERESTED")).toBeNull();
  });

  it("R-121: INTERESTED moves C→B with CallLog + LEAD_GRADE_CHANGE; NO_ANSWER keeps grade and lastContactedAt", async () => {
    const staff = await staffUser("STAFF_PLACEMENT");
    const l = await lead(uniq("call"));
    const now = new Date();

    expect(
      await recordLeadCall({ actorId: staff.id, leadId: l.id, outcome: "NO_ANSWER", now }),
    ).toEqual({ ok: true, grade: "C" });
    let row = await db.jobLead.findUniqueOrThrow({ where: { id: l.id } });
    expect(row.lastContactedAt).toBeNull();
    expect(await auditRows(l.id, "LEAD_GRADE_CHANGE")).toHaveLength(0);

    const next = new Date(now.getTime() + 3 * DAY_MS);
    expect(
      await recordLeadCall({
        actorId: staff.id,
        leadId: l.id,
        outcome: "INTERESTED",
        note: "다음 주 다시 통화",
        nextActionAt: next,
        now,
      }),
    ).toEqual({ ok: true, grade: "B" });
    row = await db.jobLead.findUniqueOrThrow({ where: { id: l.id } });
    expect(row.grade).toBe("B");
    expect(row.foreignIntent).toBe(true);
    expect(row.lastContactedAt?.getTime()).toBe(now.getTime());
    expect(row.nextActionAt?.getTime()).toBe(next.getTime());

    const logs = await db.callLog.findMany({ where: { leadId: l.id }, orderBy: { at: "asc" } });
    expect(logs.map((c) => c.outcome)).toEqual(["NO_ANSWER", "INTERESTED"]);
    const audit = await auditRows(l.id, "LEAD_GRADE_CHANGE");
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      actorId: staff.id,
      entity: "JobLead",
      meta: { from: "C", to: "B", reason: "CALL_INTERESTED" },
    });
  });

  it("R-121: DNC moves to DO_NOT_CONTACT (audited) and later calls are refused", async () => {
    const staff = await staffUser("STAFF_PLACEMENT");
    const l = await lead(uniq("call"), { grade: "B" });
    expect(await recordLeadCall({ actorId: staff.id, leadId: l.id, outcome: "DNC" })).toEqual({
      ok: true,
      grade: "DO_NOT_CONTACT",
    });
    expect((await auditRows(l.id, "LEAD_GRADE_CHANGE"))[0].meta).toEqual({
      from: "B",
      to: "DO_NOT_CONTACT",
      reason: "CALL_DNC",
    });
    expect(
      await recordLeadCall({ actorId: staff.id, leadId: l.id, outcome: "INTERESTED" }),
    ).toEqual({
      ok: false,
      code: "LEAD_DNC",
    });
    expect(await db.callLog.count({ where: { leadId: l.id } })).toBe(1);
  });

  it("R-121: a note with a contact is refused and nothing is stored", async () => {
    const staff = await staffUser("STAFF_PLACEMENT");
    const l = await lead(uniq("call"));
    expect(
      await recordLeadCall({
        actorId: staff.id,
        leadId: l.id,
        outcome: "INTERESTED",
        note: "담당자 010-1234-5678",
      }),
    ).toEqual({ ok: false, code: "NOTE_HAS_CONTACT" });
    expect(await db.callLog.count({ where: { leadId: l.id } })).toBe(0);
    expect(await gradeOf(l.id)).toBe("C");
  });

  it("R-121 / BR-05: 구인신청 접수 → B, then 직원 검증 → A (audited, LEAD_REVIEW closed)", async () => {
    const staff = await staffUser("STAFF_PLACEMENT");
    const l = await lead(uniq("call"));
    // Verification needs a B lead with a request.
    expect(await verifyLead({ actorId: staff.id, leadId: l.id })).toEqual({
      ok: false,
      code: "LEAD_STATE",
    });
    await recordLeadCall({ actorId: staff.id, leadId: l.id, outcome: "INTERESTED" });
    expect(await verifyLead({ actorId: staff.id, leadId: l.id })).toEqual({
      ok: false,
      code: "NOT_REQUESTED",
    });
    expect(
      await recordLeadCall({ actorId: staff.id, leadId: l.id, outcome: "REQUEST_RECEIVED" }),
    ).toEqual({ ok: true, grade: "B" });
    expect(
      (await db.jobLead.findUniqueOrThrow({ where: { id: l.id } })).requestedAt,
    ).not.toBeNull();

    const task = await db.staffTask.create({
      data: { type: "LEAD_REVIEW", leadId: l.id, assigneeRole: "STAFF_PLACEMENT" },
    });
    expect(await verifyLead({ actorId: staff.id, leadId: l.id })).toEqual({ ok: true, grade: "A" });
    expect(await gradeOf(l.id)).toBe("A");
    expect((await db.staffTask.findUniqueOrThrow({ where: { id: task.id } })).status).toBe("DONE");
    expect((await auditRows(l.id, "LEAD_GRADE_CHANGE")).map((a) => a.meta)).toEqual([
      { from: "C", to: "B", reason: "CALL_INTERESTED" },
      { from: "B", to: "A", reason: "STAFF_VERIFIED" },
    ]);
  });

  it("R-121: a diagnosis lead without company name cannot be verified to A", async () => {
    const staff = await staffUser("STAFF_PLACEMENT");
    const l = await lead(uniq("call"), {
      source: "DIAGNOSIS",
      companyName: null,
      title: null,
      grade: "B",
      requestedAt: new Date(),
    });
    expect(await verifyLead({ actorId: staff.id, leadId: l.id })).toEqual({
      ok: false,
      code: "NO_COMPANY",
    });
  });
});

describe("R-121 lead board default order", () => {
  it("R-121: every column is sorted by priority descending; waiting = matching S·A seekers", async () => {
    const tag = uniq("board");
    const sTag = uniq("boardS");
    const industry = await db.industry.findFirstOrThrow({ select: { code: true } });
    const region = await db.region.findFirstOrThrow({ where: { level: "SIDO" } });
    const now = new Date();
    const old = new Date(now.getTime() - 30 * DAY_MS);

    // Seekers that count: one S (2) + one A (1) wanting this region/industry; others do not count.
    const want = { desiredRegions: [region.code], desiredIndustries: [industry.code] };
    await seeker(sTag, { grade: "S", track: "JOB_MATCH", status: "ACTIVE", ...want });
    await seeker(sTag, { grade: "A", track: "JOB_MATCH", status: "ACTIVE", ...want });
    await seeker(sTag, { grade: "B", track: "JOB_MATCH", status: "ACTIVE", ...want });
    await seeker(sTag, { grade: "A", track: "FUTURE_POOL", status: "ACTIVE", ...want });
    await seeker(sTag, { grade: "A", track: "JOB_MATCH", status: "INACTIVE", ...want });

    const mk = (over: object) =>
      lead(tag, { grade: "C", sido: region.code, postedAt: old, createdAt: old, ...over });
    const plain = await mk({ industryCode: null }); // 0
    const fresh = await mk({ industryCode: null, postedAt: now }); // newness only
    const depop = await mk({ industryCode: null, depopulationArea: true }); // depopulation only
    const matched = await mk({ industryCode: industry.code }); // (2+1)×2 = 6
    const top = await mk({ industryCode: industry.code, depopulationArea: true, postedAt: now });

    const board = await buildLeadBoard(now, {
      scope: { sourceRef: { startsWith: tag } },
      seekerScope: { sourceChannel: sTag },
    });
    const c = board.find((col) => col.grade === "C")!;
    expect(c.total).toBe(5);
    const w = LEAD_PRIORITY_WEIGHTS;
    const matchScore = (w.seekerGrade.S + w.seekerGrade.A) * w.matchMultiplier;
    const byId = new Map(c.cards.map((x) => [x.id, x]));
    expect(byId.get(plain.id)?.priority).toBe(0);
    expect(byId.get(fresh.id)?.priority).toBe(w.newLeadBonus);
    expect(byId.get(depop.id)?.priority).toBe(w.depopulationBonus);
    expect(byId.get(matched.id)).toMatchObject({ priority: matchScore, waiting: 2 });
    expect(byId.get(top.id)?.priority).toBe(matchScore + w.depopulationBonus + w.newLeadBonus);

    const priorities = c.cards.map((x) => x.priority);
    expect(priorities).toEqual([...priorities].sort((a, b) => b - a));
    expect(c.cards[0].id).toBe(top.id);
    expect(c.cards.at(-1)?.id).toBe(plain.id);
    expect(board.map((col) => col.grade)).toEqual(["C", "B", "A", "ARCHIVED", "DO_NOT_CONTACT"]);
  });
});
