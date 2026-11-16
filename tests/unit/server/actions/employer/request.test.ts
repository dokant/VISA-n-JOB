/**
 * R-125 server actions: the 구인 의뢰 action refuses a request whose free text carries a contact
 * (BR-14) before anything is stored, and needs a signed-in employer. The 무료 채용 진단 action is
 * public and links a signed-in company. Sessions and request headers are mocked.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { EmployerActor } from "@/lib/employer/session";
import type { JobRequestInput } from "@/schemas/employer/request";
import { AuthzError } from "@/lib/rbac";

import { testPrisma } from "../../../db/helpers";
import { createEmployer, seededRefs } from "../../../lib/employer/employerFixtures";

const session = vi.hoisted(() => ({ actor: null as EmployerActor | null }));

vi.mock("@/lib/employer/session", () => ({
  requireEmployer: vi.fn(async () => {
    if (!session.actor) throw new AuthzError("UNAUTHENTICATED", 401, "no session");
    return session.actor;
  }),
  currentEmployer: vi.fn(async () => session.actor),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const { submitJobRequestAction } = await import("@/server/actions/employer/request");
const { submitDiagnosis } = await import("@/server/actions/employer/diagnosis");

const prisma = testPrisma();
afterAll(() => prisma.$disconnect());
beforeEach(() => {
  session.actor = null;
});

async function input(over: Record<string, string> = {}): Promise<JobRequestInput> {
  const refs = await seededRefs();
  return {
    companyName: "액션 테스트 제조",
    sido: refs.sido,
    sigungu: refs.sigungu,
    employeeCount: "20",
    contactName: "박담당",
    contactPhone: "010-5678-1234",
    contactEmail: "",
    role: "조립",
    payMin: "2600000",
    payMax: "",
    workHours: "08:00~17:00",
    overtime: "NONE",
    headcount: "4",
    startTiming: "IMMEDIATE",
    dormitory: "ALLOWANCE",
    meals: "PROVIDED",
    preferences: "",
    detail: "",
    ...over,
  } as JobRequestInput;
}

describe("R-125 submitJobRequestAction", () => {
  it("UNAUTHENTICATED without an employer session", async () => {
    expect(await submitJobRequestAction(await input())).toEqual({
      ok: false,
      code: "UNAUTHENTICATED",
    });
  });

  it("R-125 BR-14: a contact in a free-text field is refused with the fields, nothing is stored", async () => {
    session.actor = await createEmployer();
    const r = await submitJobRequestAction(
      await input({ detail: "급하면 010-2222-3333 으로 전화", preferences: "카톡 hongjob" }),
    );
    expect(r).toEqual({ ok: false, code: "CONTACT_INFO", fields: ["preferences", "detail"] });
    expect(await prisma.jobLead.count({ where: { companyId: session.actor.companyId } })).toBe(0);
    const company = await prisma.company.findUniqueOrThrow({
      where: { id: session.actor.companyId },
    });
    expect(company.employeeCount).toBeNull();
  });

  it("R-125: a valid request is stored as a B lead", async () => {
    session.actor = await createEmployer();
    expect(await submitJobRequestAction(await input())).toEqual({ ok: true });
    const leads = await prisma.jobLead.findMany({ where: { companyId: session.actor.companyId } });
    expect(leads.map((l) => l.grade)).toEqual(["B"]);
  });

  it("VALIDATION for a broken form (no lead)", async () => {
    session.actor = await createEmployer();
    const r = await submitJobRequestAction(await input({ headcount: "" }));
    expect(r).toMatchObject({ ok: false, code: "VALIDATION", fields: ["headcount"] });
  });
});

describe("R-124 submitDiagnosis", () => {
  it("is public, and links the lead to a signed-in company", async () => {
    const refs = await seededRefs();
    const answers = {
      industryCode: refs.industryCode,
      sido: refs.sido,
      sigungu: refs.sigungu,
      regularEmployees: "5",
      insuredDomestic: "5",
      foreignWorkers: [],
    };
    const anon = await submitDiagnosis(answers);
    expect(anon.status).toBe("ok");

    session.actor = await createEmployer();
    const linked = await submitDiagnosis(answers);
    expect(linked.status).toBe("ok");
    expect(
      await prisma.jobLead.count({
        where: { companyId: session.actor.companyId, source: "DIAGNOSIS" },
      }),
    ).toBe(1);
    expect(await submitDiagnosis({ ...answers, regularEmployees: "" })).toEqual({
      status: "error",
      code: "VALIDATION",
    });
  });
});
