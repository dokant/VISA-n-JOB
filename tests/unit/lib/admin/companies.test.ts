/**
 * R-218 / PC-2: 관리자 기업 검증·계약 등록. Setting `verified` or `contractSignedAt` writes AuditLog
 * COMPANY_VERIFY in the same transaction; until both are set the company sees the summary only
 * (R-205). The list shows decrypted names (one PII_VIEW per view) and marks companies created
 * automatically from collected leads (no business number, no account — Q-17 ①).
 */
import { afterAll, describe, expect, it } from "vitest";

import { listAdminCompanies, setCompanyContract, setCompanyVerified } from "@/lib/admin/companies";
import { candidateAccessOf } from "@/lib/candidates/access";
import { db } from "@/lib/db";
import { STAFF_RECORDED_CONTRACT } from "@/lib/employer/contract";

import { company } from "../candidates/candidateFixtures";
import { auditRows, staffUser } from "./adminFixtures";

afterAll(() => db.$disconnect());

describe("R-218 company verification and contract", () => {
  it("R-218: verify + contract → LIST access; each change writes COMPANY_VERIFY", async () => {
    const staff = await staffUser("STAFF_PLACEMENT");
    const c = await company();
    expect((await candidateAccessOf(c.companyId)).level).toBe("STATS");

    const now = new Date("2026-11-20T02:00:00.000Z");
    expect(
      await setCompanyVerified({ actorId: staff.id, companyId: c.companyId, verified: true, now }),
    ).toEqual({ ok: true });
    let row = await db.company.findUniqueOrThrow({ where: { id: c.companyId } });
    expect(row).toMatchObject({ verified: true, verifiedBy: staff.id, verifiedAt: now });
    expect((await candidateAccessOf(c.companyId)).level).toBe("STATS");

    const signedOn = new Date("2026-11-19T00:00:00+09:00");
    expect(
      await setCompanyContract({ actorId: staff.id, companyId: c.companyId, signedOn }),
    ).toEqual({ ok: true });
    row = await db.company.findUniqueOrThrow({ where: { id: c.companyId } });
    expect(row).toMatchObject({
      contractSignedAt: signedOn,
      contractVersion: STAFF_RECORDED_CONTRACT,
    });
    expect((await candidateAccessOf(c.companyId)).level).toBe("LIST");

    const audits = await auditRows(c.companyId, "COMPANY_VERIFY");
    expect(audits.map((a) => a.meta)).toEqual([
      { change: "VERIFY" },
      { change: "CONTRACT_SET", signedOn: "2026-11-19" },
    ]);
    expect(audits.every((a) => a.actorId === staff.id && a.entity === "Company")).toBe(true);
  });

  it("unverify / clear contract are audited too; the same state is refused without a log", async () => {
    const staff = await staffUser("ADMIN");
    const c = await company({ verified: true, contracted: true });
    expect(
      await setCompanyVerified({ actorId: staff.id, companyId: c.companyId, verified: true }),
    ).toEqual({ ok: false, code: "SAME_STATE" });
    expect(
      await setCompanyVerified({ actorId: staff.id, companyId: c.companyId, verified: false }),
    ).toEqual({ ok: true });
    expect(
      await setCompanyContract({ actorId: staff.id, companyId: c.companyId, signedOn: null }),
    ).toEqual({ ok: true });
    expect(
      await setCompanyContract({ actorId: staff.id, companyId: c.companyId, signedOn: null }),
    ).toEqual({ ok: false, code: "SAME_STATE" });
    const row = await db.company.findUniqueOrThrow({ where: { id: c.companyId } });
    expect(row).toMatchObject({
      verified: false,
      verifiedBy: null,
      verifiedAt: null,
      contractSignedAt: null,
      contractVersion: null,
    });
    expect((await auditRows(c.companyId, "COMPANY_VERIFY")).map((a) => a.meta)).toEqual([
      { change: "UNVERIFY" },
      { change: "CONTRACT_CLEAR" },
    ]);
    expect(
      await setCompanyVerified({ actorId: staff.id, companyId: "missing", verified: true }),
    ).toEqual({ ok: false, code: "NOT_FOUND" });
  });

  it("Q-17 ①: the list marks auto-created companies (no business number, no account); PII_VIEW per view", async () => {
    const staff = await staffUser("STAFF_PLACEMENT");
    const signedUp = await company();
    await db.company.update({
      where: { id: signedUp.companyId },
      data: { bizRegNoHash: `hash-${signedUp.companyId}` },
    });
    const auto = await db.company.create({
      data: { nameEnc: "수집 리드 자동 생성 기업", industryCode: "C", sido: "SEOUL" },
    });
    const before = await db.auditLog.count({
      where: { action: "PII_VIEW", entity: "Company", actorId: staff.id },
    });
    const rows = await listAdminCompanies(staff.id);
    const byId = new Map(rows.map((r) => [r.id, r]));
    expect(byId.get(auto.id)).toMatchObject({
      name: "수집 리드 자동 생성 기업",
      hasBizRegNo: false,
      autoCreated: true,
      accounts: 0,
    });
    expect(byId.get(signedUp.companyId)).toMatchObject({
      hasBizRegNo: true,
      autoCreated: false,
      accounts: 1,
    });
    const views = await db.auditLog.findMany({
      where: { action: "PII_VIEW", entity: "Company", actorId: staff.id },
    });
    expect(views).toHaveLength(before + 1);
    expect(views.at(-1)?.meta).toEqual({ fields: ["nameEnc"], count: rows.length });
  });
});
