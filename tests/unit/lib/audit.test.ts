/**
 * R-011: writeAudit appends AuditLog rows (BR-15, STANDARD 4.8).
 * AuditLog is append-only (DB triggers, R-006), so these tests only INSERT and never clean up.
 */
import { inject } from "vitest";
import { afterAll, describe, expect, it } from "vitest";

import {
  AUDIT_ACTIONS,
  AuditAction,
  AuditInputError,
  SYSTEM_ACTOR,
  auditPiiExport,
  auditPiiView,
  isAuditAction,
  writeAudit,
} from "@/lib/audit";
import { db } from "@/lib/db";

import { testPrisma, uniq } from "../db/helpers";

const prisma = testPrisma();
afterAll(() => prisma.$disconnect());

async function rowsFor(entityId: string) {
  return prisma.auditLog.findMany({ where: { entityId } });
}

describe("R-011 audit", () => {
  it("STANDARD 4.8: action constants are the listed 11 names + P1e SEEKER_REVIEW_UPDATE", () => {
    expect([...AUDIT_ACTIONS]).toEqual([
      "PII_VIEW",
      "PII_EXPORT",
      "SEEKER_GRADE_CHANGE",
      "SEEKER_TRACK_CHANGE",
      "LEAD_GRADE_CHANGE",
      "RECOMMENDATION_CREATE",
      "POSTING_PUBLISH",
      "CANDIDATE_BULK_VIEW",
      "RULE_PUBLISH",
      "CONSENT_REVOKE",
      "COMPANY_VERIFY",
      "SEEKER_REVIEW_UPDATE",
    ]);
    expect(AuditAction.COMPANY_VERIFY).toBe("COMPANY_VERIFY");
    expect(Object.isFrozen(AuditAction)).toBe(true);
    expect(isAuditAction("PII_VIEW")).toBe(true);
    expect(isAuditAction("DELETE_ALL")).toBe(false);
  });

  it("R-011: writeAudit creates an AuditLog row for every action", async () => {
    const entityId = uniq("seeker");
    for (const action of AUDIT_ACTIONS) {
      const row = await writeAudit(
        {
          actorId: "staff-1",
          action,
          entity: "SeekerProfile",
          entityId,
          meta: { from: "B", to: "A" },
        },
        prisma,
      );
      expect(row.id).toBeTruthy();
      expect(row.action).toBe(action);
    }
    const rows = await rowsFor(entityId);
    expect(rows).toHaveLength(AUDIT_ACTIONS.length);
    expect(rows.every((r) => r.actorId === "staff-1" && r.entity === "SeekerProfile")).toBe(true);
    expect(rows[0].meta).toEqual({ from: "B", to: "A" });
    expect(rows[0].at).toBeInstanceOf(Date);
  });

  it("R-011: default client is the app db (pointing at the test DB); meta is optional", async () => {
    expect(process.env.DATABASE_URL).toBe(inject("databaseUrl"));
    const entityId = uniq("lead");
    await writeAudit({
      actorId: SYSTEM_ACTOR,
      action: AuditAction.LEAD_GRADE_CHANGE,
      entity: "JobLead",
      entityId,
    });
    const rows = await rowsFor(entityId);
    expect(rows).toHaveLength(1);
    expect(rows[0].actorId).toBe("SYSTEM");
    expect(rows[0].meta).toBeNull();
    await db.$disconnect();
  });

  it("R-122 / PC-14: auditPiiView and auditPiiExport log field names, never values", async () => {
    const entityId = uniq("seeker");
    await auditPiiView(
      {
        actorId: "admin-1",
        entity: "SeekerProfile",
        entityId,
        fields: ["legalNameEnc", "phoneEnc"],
      },
      prisma,
    );
    const batchId = uniq("export");
    await auditPiiExport(
      {
        actorId: "admin-1",
        entity: "SeekerProfile",
        batchId,
        rowCount: 3,
        fields: ["legalNameEnc"],
      },
      prisma,
    );
    const view = await rowsFor(entityId);
    expect(view[0].action).toBe("PII_VIEW");
    expect(view[0].meta).toEqual({ fields: ["legalNameEnc", "phoneEnc"] });
    const exp = await rowsFor(batchId);
    expect(exp[0].action).toBe("PII_EXPORT");
    expect(exp[0].meta).toEqual({ rowCount: 3, fields: ["legalNameEnc"] });
  });

  it("rejects invalid input and plaintext PII in meta without writing a row", async () => {
    const entityId = uniq("bad");
    const ok = { actorId: "a", action: "PII_VIEW" as const, entity: "User", entityId };
    await expect(
      writeAudit({ ...ok, action: "NOPE" as unknown as AuditAction }, prisma),
    ).rejects.toThrow(/unknown audit action/);
    await expect(writeAudit({ ...ok, actorId: " " }, prisma)).rejects.toThrow(/actorId/);
    await expect(writeAudit({ ...ok, entity: "" }, prisma)).rejects.toThrow(/entity is required/);
    await expect(
      writeAudit({ ...ok, meta: { note: "전화 010-1234-5678" } }, prisma),
    ).rejects.toThrow(AuditInputError);
    await expect(
      writeAudit({ ...ok, meta: { list: ["ok", "hong@example.com"] } }, prisma),
    ).rejects.toThrow(/meta\.list\[1\]/);
    await expect(
      writeAudit({ ...ok, meta: { nested: { phoneEnc: "v1:abc" } } }, prisma),
    ).rejects.toThrow(/must not be logged/);
    await expect(writeAudit({ ...ok, meta: { password: "x" } }, prisma)).rejects.toThrow(
      /password/,
    );
    expect(await rowsFor(entityId)).toHaveLength(0);
  });

  it("a transaction client writes the log atomically with the change", async () => {
    const entityId = uniq("tx");
    await expect(
      prisma.$transaction(async (tx) => {
        await writeAudit(
          { actorId: "a", action: "RULE_PUBLISH", entity: "VisaRule", entityId },
          tx,
        );
        throw new Error("rollback");
      }),
    ).rejects.toThrow("rollback");
    expect(await rowsFor(entityId)).toHaveLength(0);

    await prisma.$transaction(async (tx) => {
      await writeAudit({ actorId: "a", action: "RULE_PUBLISH", entity: "VisaRule", entityId }, tx);
    });
    expect(await rowsFor(entityId)).toHaveLength(1);
  });
});
