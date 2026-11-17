/**
 * R-216 / WO §11 직원 권한 분리: STAFF_PLACEMENT cannot read stay case details (VisaCase);
 * STAFF_VISA and ADMIN can. BR-13: VisaCase has no 고유식별정보 column. Also Placement basics
 * (one per recommendation, no delete path).
 */
import { Prisma } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";

import * as placements from "@/lib/admin/placements";
import { createVisaCase, getVisaCase, listVisaCases, updateVisaCase } from "@/lib/admin/visaCases";
import { db } from "@/lib/db";
import { AuthzError, can } from "@/lib/rbac";

import { matchSeeker, matchSetup, recommendedInterview } from "../recommendations/matchingFixtures";
import { staffUser } from "./adminFixtures";

afterAll(() => db.$disconnect());

const FIELDS = {
  caseType: "CHANGE" as const,
  targetVisa: null,
  status: "OPEN" as const,
  companyId: null,
  mandateSignedAt: null,
  fee: null,
};

describe("R-216 VisaCase access (WO §11)", () => {
  it("R-216: STAFF_PLACEMENT is refused the VisaCase detail and list; STAFF_VISA and ADMIN may read", async () => {
    const setup = await matchSetup("V1");
    const s = await matchSeeker(setup);
    const visaStaff = await staffUser("STAFF_VISA");
    const created = await createVisaCase(
      { id: visaStaff.id, role: "STAFF_VISA" },
      {
        seekerId: s.id,
        ...FIELDS,
      },
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const placement = { id: setup.staff.id, role: "STAFF_PLACEMENT" as const };
    expect(can("STAFF_PLACEMENT", "visaCase:view")).toBe(false);
    const refused = (() => {
      try {
        void getVisaCase(placement, created.id);
        return null;
      } catch (e) {
        return e;
      }
    })();
    expect(refused).toBeInstanceOf(AuthzError);
    expect((refused as AuthzError).status).toBe(403);
    expect(() => listVisaCases(placement)).toThrow(AuthzError);
    await expect(createVisaCase(placement, { seekerId: s.id, ...FIELDS })).rejects.toThrow(
      AuthzError,
    );
    await expect(
      updateVisaCase(placement, { visaCaseId: created.id, ...FIELDS, status: "CLOSED" }),
    ).rejects.toThrow(AuthzError);

    for (const role of ["STAFF_VISA", "ADMIN"] as const) {
      const row = await getVisaCase({ id: visaStaff.id, role }, created.id);
      expect(row?.id).toBe(created.id);
    }
    const updated = await updateVisaCase(
      { id: visaStaff.id, role: "ADMIN" },
      { visaCaseId: created.id, ...FIELDS, status: "FILED", fee: 300_000 },
    );
    expect(updated.ok).toBe(true);
    expect((await db.visaCase.findUniqueOrThrow({ where: { id: created.id } })).status).toBe(
      "FILED",
    );
  });

  it("R-216: the target visa must be a VisaType code; unknown company / seeker are refused", async () => {
    const setup = await matchSetup("V2");
    const s = await matchSeeker(setup);
    const actor = { id: (await staffUser("STAFF_VISA")).id, role: "STAFF_VISA" as const };
    expect(
      await createVisaCase(actor, { seekerId: s.id, ...FIELDS, targetVisa: "NOT-A-VISA" }),
    ).toEqual({ ok: false, code: "UNKNOWN_VISA" });
    expect(
      await createVisaCase(actor, { seekerId: s.id, ...FIELDS, companyId: "missing-company" }),
    ).toEqual({ ok: false, code: "COMPANY_NOT_FOUND" });
    expect(await createVisaCase(actor, { seekerId: "missing", ...FIELDS })).toEqual({
      ok: false,
      code: "NOT_FOUND",
    });
    const visa = await db.visaType.findFirstOrThrow({ select: { code: true } });
    const ok = await createVisaCase(actor, {
      seekerId: s.id,
      ...FIELDS,
      targetVisa: visa.code,
      companyId: setup.employer.companyId,
    });
    expect(ok.ok).toBe(true);
  });

  it("BR-13 / R-216: VisaCase has no 고유식별정보 column", () => {
    const model = Prisma.dmmf.datamodel.models.find((m) => m.name === "VisaCase");
    const names = (model?.fields ?? []).map((f) => f.name);
    expect(names).toEqual(
      expect.arrayContaining(["caseType", "targetVisa", "status", "mandateSignedAt", "fee"]),
    );
    for (const n of names) {
      expect(n).not.toMatch(/passport|alien|arc(No|Number)|resident|registration|identity/i);
    }
  });
});

describe("R-216 Placement", () => {
  it("R-216: one placement per recommendation, update works, no delete function", async () => {
    const setup = await matchSetup("P1");
    const s = await matchSeeker(setup);
    const { recommendation } = await recommendedInterview(setup, s.id);
    const fields = {
      contractDate: new Date("2026-12-01T00:00:00+09:00"),
      monthlyWage: 2_700_000,
      feeAmount: 500_000,
      feeStatus: "UNBILLED" as const,
    };
    const first = await placements.createPlacement({
      recommendationId: recommendation.id,
      ...fields,
    });
    expect(first.ok).toBe(true);
    expect(
      await placements.createPlacement({ recommendationId: recommendation.id, ...fields }),
    ).toEqual({ ok: false, code: "PLACEMENT_EXISTS" });
    if (!first.ok) return;
    expect(
      await placements.updatePlacement({ placementId: first.id, ...fields, feeStatus: "PAID" }),
    ).toEqual({ ok: true, id: first.id });
    expect(Object.keys(placements).filter((k) => /delete|remove/i.test(k))).toEqual([]);
    const open = await placements.recommendationsWithoutPlacement();
    expect(open.map((r) => r.id)).not.toContain(recommendation.id);
  });
});
