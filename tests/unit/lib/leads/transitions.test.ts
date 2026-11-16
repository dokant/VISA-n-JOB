/**
 * WO §8.2 / R-115 / BR-15: lead grade transition table, re-ingest rule and LEAD_GRADE_CHANGE.
 */
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  LEAD_TRANSITIONS,
  LeadTransitionError,
  canTransition,
  gradeOnReingest,
  transitionLead,
} from "@/lib/leads/transitions";

import { testPrisma, uniq } from "../../db/helpers";

const prisma = testPrisma();
afterAll(() => prisma.$disconnect());

describe("WO §8.2 lead transitions", () => {
  it("R-115: DO_NOT_CONTACT has no way out; C is reached again only from ARCHIVED", () => {
    expect(LEAD_TRANSITIONS.DO_NOT_CONTACT).toEqual([]);
    expect(canTransition("DO_NOT_CONTACT", "C")).toBe(false);
    expect(canTransition("C", "B")).toBe(true);
    expect(canTransition("B", "A")).toBe(true);
    expect(canTransition("C", "A")).toBe(false);
    expect(canTransition("ARCHIVED", "C")).toBe(true);
    for (const from of ["B", "A", "DO_NOT_CONTACT"] as const) {
      expect(canTransition(from, "C")).toBe(false);
    }
  });

  it("re-ingest grade: keeps every grade except a re-posted ARCHIVED lead", () => {
    const archivedAt = new Date("2026-10-01T00:00:00Z");
    for (const grade of ["C", "B", "A", "DO_NOT_CONTACT"] as const) {
      expect(gradeOnReingest({ grade, archivedAt: null }, { postedAt: new Date() })).toBe(grade);
    }
    expect(
      gradeOnReingest({ grade: "ARCHIVED", archivedAt }, { postedAt: new Date("2026-09-01") }),
    ).toBe("ARCHIVED");
    expect(gradeOnReingest({ grade: "ARCHIVED", archivedAt }, {})).toBe("ARCHIVED");
    expect(
      gradeOnReingest({ grade: "ARCHIVED", archivedAt }, { postedAt: new Date("2026-10-02") }),
    ).toBe("C");
  });

  it("transitionLead: guarded update + one AuditLog row; refuses moves outside the table", async () => {
    const lead = await prisma.jobLead.create({
      data: {
        source: "MANUAL",
        sourceRef: uniq("tr"),
        sido: "SEOUL",
        rawJson: {},
        grade: "C",
      },
    });
    const now = new Date();
    const moved = await db.$transaction((tx) =>
      transitionLead(tx, {
        leadId: lead.id,
        from: "C",
        to: "ARCHIVED",
        actorId: "SYSTEM",
        reason: "ARCHIVE_NO_CONTACT",
        now,
      }),
    );
    expect(moved).toBe(true);
    const after = await prisma.jobLead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(after.grade).toBe("ARCHIVED");
    expect(after.archivedAt?.getTime()).toBe(now.getTime());

    // stale `from`: nothing changes, no audit row
    const stale = await db.$transaction((tx) =>
      transitionLead(tx, {
        leadId: lead.id,
        from: "C",
        to: "B",
        actorId: "SYSTEM",
        reason: "JOB_REQUEST",
        now,
      }),
    );
    expect(stale).toBe(false);
    expect(await prisma.auditLog.count({ where: { entityId: lead.id } })).toBe(1);

    await expect(
      transitionLead(db, {
        leadId: lead.id,
        from: "DO_NOT_CONTACT",
        to: "C",
        actorId: "SYSTEM",
        reason: "INGEST_REPOSTED",
        now,
      }),
    ).rejects.toBeInstanceOf(LeadTransitionError);
  });
});
