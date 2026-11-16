/**
 * R-116: "시간 조작 테스트로 보관 전이 확인". The handler takes `now`, so the clock is moved by
 * passing a later date — no pg-boss and no real waiting (PLAN 위험 "pg-boss 시간 조작").
 * Leads are created with dates far in the future of the other tests, so only this file's rows
 * can match the fake clocks used here.
 */
import { afterAll, describe, expect, it } from "vitest";

import { LEAD_ARCHIVE_NO_CONTACT_DAYS } from "@/config/limits";
import { archiveStaleLeads, staleLeadWhere } from "@/lib/jobs/archiveLeads";

import { testPrisma, uniq } from "../../db/helpers";

const prisma = testPrisma();
afterAll(() => prisma.$disconnect());

const DAY_MS = 86_400_000;
const T0 = new Date("2031-03-01T00:00:00Z"); // far from "now" of every other test
const at = (days: number) => new Date(T0.getTime() + days * DAY_MS);

async function lead(data: Partial<Parameters<typeof prisma.jobLead.create>[0]["data"]>) {
  return prisma.jobLead.create({
    data: {
      source: "MANUAL",
      sourceRef: uniq("arch"),
      companyName: "보관 테스트",
      title: "보관 테스트",
      sido: "SEOUL",
      rawJson: {},
      grade: "C",
      createdAt: T0,
      ...data,
    },
  });
}

async function grade(id: string) {
  return (await prisma.jobLead.findUniqueOrThrow({ where: { id } })).grade;
}

// Only this file's leads: the database is shared with test files running in parallel.
const mine = { sourceRef: { startsWith: "arch-" } };
const run = (now: Date) => archiveStaleLeads(now, { scope: mine });

describe("R-116 archiveStaleLeads(now)", () => {
  it("R-116: archives C leads after the no-contact window and after closing, nothing else", async () => {
    const days = LEAD_ARCHIVE_NO_CONTACT_DAYS;
    const neverContacted = await lead({});
    const contactedLater = await lead({ lastContactedAt: at(10) });
    const closesSoon = await lead({ closesAt: at(5) });
    const callBackBooked = await lead({ nextActionAt: at(days + 10) });
    const gradeB = await lead({ grade: "B" });
    const dnc = await lead({ grade: "DO_NOT_CONTACT", closesAt: at(1) });

    const ids = [neverContacted, contactedLater, closesSoon, callBackBooked, gradeB, dnc].map(
      (l) => l.id,
    );
    const count = (now: Date) =>
      prisma.jobLead.count({ where: { AND: [staleLeadWhere(now), { id: { in: ids } }] } });

    // day 4: nothing is due yet
    expect(await count(at(4))).toBe(0);

    // day 6: only the closed posting
    const r1 = await run(at(6));
    expect(r1.closed).toBeGreaterThanOrEqual(1);
    expect(await grade(closesSoon.id)).toBe("ARCHIVED");
    expect(await grade(neverContacted.id)).toBe("C");

    // one day before the window ends: still C
    await run(at(days - 1));
    expect(await grade(neverContacted.id)).toBe("C");

    // window reached: never-contacted lead archived; later contact and booked call-back stay
    const r2 = await run(at(days));
    expect(r2.noContact).toBeGreaterThanOrEqual(1);
    expect(await grade(neverContacted.id)).toBe("ARCHIVED");
    expect(await grade(contactedLater.id)).toBe("C");
    expect(await grade(callBackBooked.id)).toBe("C");

    // window counted from the last contact
    await run(at(10 + days));
    expect(await grade(contactedLater.id)).toBe("ARCHIVED");

    // after the booked call-back time has passed, it is due as well
    await run(at(days + 11));
    expect(await grade(callBackBooked.id)).toBe("ARCHIVED");

    // B and DO_NOT_CONTACT are never touched (WO §8.2 arrow starts at C)
    await run(at(days * 10));
    expect(await grade(gradeB.id)).toBe("B");
    expect(await grade(dnc.id)).toBe("DO_NOT_CONTACT");
  });

  it("BR-15: every archive writes LEAD_GRADE_CHANGE by SYSTEM with the reason, archivedAt = now", async () => {
    const closed = await lead({ closesAt: at(400) });
    const now = at(401);
    await run(now);
    const row = await prisma.jobLead.findUniqueOrThrow({ where: { id: closed.id } });
    expect(row.grade).toBe("ARCHIVED");
    expect(row.archivedAt?.getTime()).toBe(now.getTime());
    const logs = await prisma.auditLog.findMany({ where: { entityId: closed.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      actorId: "SYSTEM",
      action: "LEAD_GRADE_CHANGE",
      meta: { from: "C", to: "ARCHIVED", reason: "ARCHIVE_CLOSED" },
    });

    // running again is a no-op for this lead
    await run(now);
    expect(await prisma.auditLog.count({ where: { entityId: closed.id } })).toBe(1);
  });
});
