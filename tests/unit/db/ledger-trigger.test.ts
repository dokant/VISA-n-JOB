/**
 * R-006 / WO §15-7 / BR-09: Recommendation and AuditLog reject UPDATE, DELETE and TRUNCATE at the
 * database level (raw SQL and Prisma client alike). INSERT keeps working.
 */
import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { testPrisma, uniq } from "./helpers";

const prisma: PrismaClient = testPrisma();
afterAll(() => prisma.$disconnect());

const LEDGER_ERROR = /append-only ledger/;

let recommendationId = "";
let auditLogId = "";

beforeAll(async () => {
  const staff = await prisma.user.create({
    data: { role: "STAFF_PLACEMENT", email: `${uniq("staff")}@test.local` },
  });
  const seekerUser = await prisma.user.create({ data: { role: "SEEKER" } });
  const seeker = await prisma.seekerProfile.create({
    data: {
      userId: seekerUser.id,
      sido: "SEOUL",
      visaCode: "F-4",
      track: "JOB_MATCH",
      referralCode: uniq("ref"),
      isQuickSignup: true,
    },
  });
  const company = await prisma.company.create({
    data: { nameEnc: "test-cipher", industryCode: "C", sido: "SEOUL" },
  });
  const rec = await prisma.recommendation.create({
    data: { seekerId: seeker.id, companyId: company.id, staffId: staff.id, note: "original" },
  });
  recommendationId = rec.id;
  const log = await prisma.auditLog.create({
    data: {
      actorId: staff.id,
      action: "RECOMMENDATION_CREATE",
      entity: "Recommendation",
      entityId: rec.id,
    },
  });
  auditLogId = log.id;
});

describe("R-006 ledger triggers (WO15-07)", () => {
  it("WO15-07 R-006: triggers are installed on both tables", async () => {
    const rows = await prisma.$queryRaw<{ tgname: string }[]>`
      SELECT tgname FROM pg_trigger WHERE NOT tgisinternal ORDER BY tgname`;
    expect(rows.map((r) => r.tgname)).toEqual(
      expect.arrayContaining([
        "AuditLog_no_truncate",
        "AuditLog_no_update_delete",
        "Recommendation_no_truncate",
        "Recommendation_no_update_delete",
      ]),
    );
  });

  it("WO15-07 R-006: raw SQL UPDATE on Recommendation fails", async () => {
    await expect(
      prisma.$executeRawUnsafe(
        `UPDATE "Recommendation" SET note = 'changed' WHERE id = $1`,
        recommendationId,
      ),
    ).rejects.toThrow(LEDGER_ERROR);
  });

  it("WO15-07 R-006: raw SQL DELETE on Recommendation fails", async () => {
    await expect(
      prisma.$executeRawUnsafe(`DELETE FROM "Recommendation" WHERE id = $1`, recommendationId),
    ).rejects.toThrow(LEDGER_ERROR);
  });

  it("WO15-07 R-006: TRUNCATE on Recommendation fails", async () => {
    await expect(prisma.$executeRawUnsafe(`TRUNCATE "Recommendation" CASCADE`)).rejects.toThrow(
      LEDGER_ERROR,
    );
  });

  it("WO15-07 R-006: Prisma update/delete on Recommendation fail", async () => {
    await expect(
      prisma.recommendation.update({ where: { id: recommendationId }, data: { note: "x" } }),
    ).rejects.toThrow(LEDGER_ERROR);
    await expect(prisma.recommendation.delete({ where: { id: recommendationId } })).rejects.toThrow(
      LEDGER_ERROR,
    );
    await expect(prisma.recommendation.deleteMany({})).rejects.toThrow(LEDGER_ERROR);
  });

  it("R-006: raw SQL UPDATE / DELETE / TRUNCATE on AuditLog fail", async () => {
    await expect(
      prisma.$executeRawUnsafe(`UPDATE "AuditLog" SET action = 'X' WHERE id = $1`, auditLogId),
    ).rejects.toThrow(LEDGER_ERROR);
    await expect(
      prisma.$executeRawUnsafe(`DELETE FROM "AuditLog" WHERE id = $1`, auditLogId),
    ).rejects.toThrow(LEDGER_ERROR);
    await expect(prisma.$executeRawUnsafe(`TRUNCATE "AuditLog"`)).rejects.toThrow(LEDGER_ERROR);
  });

  it("R-006: Prisma update/delete on AuditLog fail", async () => {
    await expect(
      prisma.auditLog.update({ where: { id: auditLogId }, data: { action: "X" } }),
    ).rejects.toThrow(LEDGER_ERROR);
    await expect(prisma.auditLog.deleteMany({})).rejects.toThrow(LEDGER_ERROR);
  });

  it("R-006: rows are unchanged and INSERT still works", async () => {
    const rec = await prisma.recommendation.findUniqueOrThrow({ where: { id: recommendationId } });
    expect(rec.note).toBe("original");
    const log = await prisma.auditLog.findUniqueOrThrow({ where: { id: auditLogId } });
    expect(log.action).toBe("RECOMMENDATION_CREATE");
    const more = await prisma.auditLog.create({
      data: { actorId: "SYSTEM", action: "PII_VIEW", entity: "SeekerProfile", entityId: "x" },
    });
    expect(more.id).toBeTruthy();
  });
});
