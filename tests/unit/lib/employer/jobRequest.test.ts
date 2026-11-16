/**
 * R-125 구인 의뢰서: company values encrypted, lead → B (or a new B lead) with LEAD_GRADE_CHANGE,
 * LEAD_REVIEW task for the staff verification queue, contact person only in *Enc columns.
 */
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { runDiagnosis } from "@/lib/employer/diagnosis";
import { listCompanyRequests, submitJobRequest } from "@/lib/employer/jobRequest";
import { diagnosisSchema } from "@/schemas/employer/diagnosis";
import { jobRequestSchema } from "@/schemas/employer/request";

import { testPrisma } from "../../db/helpers";
import { createEmployer, seededRefs } from "./employerFixtures";

const prisma = testPrisma();
afterAll(() => prisma.$disconnect());

async function values(over: Record<string, unknown> = {}) {
  const refs = await seededRefs();
  return jobRequestSchema.parse({
    companyName: "새 회사명 제조",
    sido: refs.sido,
    sigungu: refs.sigungu,
    employeeCount: "35",
    contactName: "김담당",
    contactPhone: "010-4567-8901",
    contactEmail: "hr-team@example.com",
    role: "용접",
    payMin: "2800000",
    payMax: "3200000",
    workHours: "08:30~17:30, 주 5일",
    overtime: "SOMETIMES",
    headcount: "3",
    startTiming: "WITHIN_1M",
    dormitory: "PROVIDED",
    meals: "PARTIAL",
    preferences: "한국어 기초 회화 가능하면 좋습니다",
    detail: "",
    ...over,
  });
}

describe("R-125 submitJobRequest", () => {
  it("R-125: without an earlier lead a new lead is created at B, with audit and a review task", async () => {
    const actor = await createEmployer();
    const r = await submitJobRequest(actor, await values());
    expect(r).toMatchObject({ ok: true, linked: false });
    if (!r.ok) return;

    const lead = await prisma.jobLead.findUniqueOrThrow({ where: { id: r.leadId } });
    expect(lead).toMatchObject({
      grade: "B",
      source: "REQUEST",
      companyId: actor.companyId,
      title: "용접",
      payMin: 2_800_000,
      payMax: 3_200_000,
    });
    expect(lead.requestedAt).not.toBeNull();
    expect(lead.requestJson).toMatchObject({ role: "용접", headcount: 3, dormitory: "PROVIDED" });

    const logs = await prisma.auditLog.findMany({ where: { entityId: r.leadId } });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      action: "LEAD_GRADE_CHANGE",
      actorId: actor.id,
      meta: { from: null, to: "B", reason: "JOB_REQUEST" },
    });
    const tasks = await prisma.staffTask.findMany({ where: { leadId: r.leadId } });
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      type: "LEAD_REVIEW",
      status: "OPEN",
      assigneeRole: "STAFF_PLACEMENT",
      companyId: actor.companyId,
    });
  });

  it("R-125 B 전이: the company's C lead (its diagnosis) moves C → B with LEAD_GRADE_CHANGE", async () => {
    const actor = await createEmployer();
    const refs = await seededRefs();
    const diag = await runDiagnosis(
      diagnosisSchema.parse({
        industryCode: refs.industryCode,
        sido: refs.sido,
        sigungu: refs.sigungu,
        regularEmployees: "10",
        insuredDomestic: "9",
        foreignWorkers: [],
      }),
      { companyId: actor.companyId, actorId: actor.id },
    );
    if (!diag.ok) throw new Error("unexpected");

    const r = await submitJobRequest(actor, await values());
    expect(r).toMatchObject({ ok: true, linked: true, leadId: diag.leadId });
    const lead = await prisma.jobLead.findUniqueOrThrow({ where: { id: diag.leadId } });
    expect(lead.grade).toBe("B");
    expect(lead.source).toBe("DIAGNOSIS");
    expect(lead.diagnosisJson).not.toBeNull();
    const logs = await prisma.auditLog.findMany({ where: { entityId: diag.leadId } });
    expect(logs.map((l) => l.meta)).toEqual([{ from: "C", to: "B", reason: "JOB_REQUEST" }]);
    expect(await prisma.jobLead.count({ where: { companyId: actor.companyId } })).toBe(1);
  });

  it("a DO_NOT_CONTACT or B lead is never reused: a second request is a new lead", async () => {
    const actor = await createEmployer();
    const first = await submitJobRequest(actor, await values());
    if (!first.ok) throw new Error("unexpected");
    const second = await submitJobRequest(actor, await values({ role: "포장" }));
    if (!second.ok) throw new Error("unexpected");
    expect(second.leadId).not.toBe(first.leadId);

    await prisma.jobLead.update({
      where: { id: first.leadId },
      data: { grade: "DO_NOT_CONTACT" },
    });
    const third = await submitJobRequest(actor, await values({ role: "조리" }));
    if (!third.ok) throw new Error("unexpected");
    expect(third.leadId).not.toBe(first.leadId);
    expect((await prisma.jobLead.findUniqueOrThrow({ where: { id: first.leadId } })).grade).toBe(
      "DO_NOT_CONTACT",
    );
    const list = await listCompanyRequests(actor.companyId);
    expect(list.map((l) => l.title).sort()).toEqual(["용접", "조리", "포장"]);
    for (const item of list) expect(Object.keys(item)).not.toContain("contactPhoneEnc");
  });

  it("company name and contact person are stored encrypted (raw DB has no plain text)", async () => {
    const actor = await createEmployer();
    const r = await submitJobRequest(actor, await values());
    if (!r.ok) throw new Error("unexpected");
    const [company] = await prisma.$queryRawUnsafe<
      Array<{ nameEnc: string; employeeCount: number }>
    >(`SELECT "nameEnc", "employeeCount" FROM "Company" WHERE id = $1`, actor.companyId);
    expect(company.nameEnc).toMatch(/^v[0-9]+:/);
    expect(company.nameEnc).not.toContain("새 회사명");
    expect(company.employeeCount).toBe(35);
    const [lead] = await prisma.$queryRawUnsafe<Array<Record<string, string>>>(
      `SELECT "contactNameEnc", "contactPhoneEnc", "contactEmailEnc", "contactPhoneHash", "requestJson"::text AS req FROM "JobLead" WHERE id = $1`,
      r.leadId,
    );
    for (const col of ["contactNameEnc", "contactPhoneEnc", "contactEmailEnc"]) {
      expect(lead[col]).toMatch(/^v[0-9]+:/);
    }
    expect(lead.req).not.toContain("4567");
    expect(lead.req).not.toContain("김담당");
    const decrypted = await db.company.findUniqueOrThrow({ where: { id: actor.companyId } });
    expect(decrypted.nameEnc).toBe("새 회사명 제조");
  });

  it("refuses a 시·군·구 that is not in the chosen 시·도", async () => {
    const actor = await createEmployer();
    const v = await values();
    const other = await prisma.region.findFirstOrThrow({
      where: { level: "SIDO", NOT: { code: v.sido } },
    });
    expect(await submitJobRequest(actor, { ...v, sido: other.code })).toEqual({
      ok: false,
      code: "INVALID_REFERENCE",
    });
  });
});
