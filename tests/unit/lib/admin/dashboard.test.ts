/**
 * R-119: "각 카운트가 DB 상태와 일치". Fixture rows are tagged and the counts are scoped to them,
 * so other test files writing to the shared DB cannot change the numbers.
 */
import { afterAll, describe, expect, it } from "vitest";

import { ADMIN_STAY_EXPIRY_SOON_DAYS } from "@/config/limits";
import {
  dashboardCounts,
  kstDayRange,
  openTaskCounts,
  openTasksWhere,
} from "@/lib/admin/dashboard";
import { db } from "@/lib/db";

import { uniq } from "../../db/helpers";
import { DAY_MS, lead, seeker, staffUser } from "./adminFixtures";

afterAll(() => db.$disconnect());

// 2032-05-10 15:00 UTC = 2032-05-11 00:00 KST (just after midnight in Korea).
const NOW = new Date("2032-05-10T15:00:00Z");
const month = (y: number, m: number) => new Date(Date.UTC(y, m - 1, 1));

describe("R-119 admin dashboard counts", () => {
  it("R-119: kstDayRange is the Korean calendar day", () => {
    const { start, end } = kstDayRange(NOW);
    expect(start.toISOString()).toBe("2032-05-10T15:00:00.000Z");
    expect(end.toISOString()).toBe("2032-05-11T15:00:00.000Z");
    const late = kstDayRange(new Date("2032-05-10T14:59:59Z"));
    expect(late.start.toISOString()).toBe("2032-05-09T15:00:00.000Z");
  });

  it("R-119: every count equals the fixture rows that match its definition", async () => {
    const tag = uniq("dash");
    const seekerScope = { sourceChannel: tag };
    const leadScope = { sourceRef: { startsWith: tag } };

    // 신규 구직자: B + not consulted + not BLOCKED → 2 of 5
    await seeker(tag, { grade: "B" });
    await seeker(tag, { grade: "B", status: "INACTIVE" });
    await seeker(tag, { grade: "B", consultedAt: NOW });
    await seeker(tag, { grade: "B", status: "BLOCKED" });
    await seeker(tag, { grade: "A", consultedAt: NOW, verifiedVisa: true });

    // 만료 임박 (D-90, month values): this month and +2 months count; last month (expired),
    // +4 months (beyond D-90) and BLOCKED do not.
    await seeker(tag, { grade: "A", consultedAt: NOW, stayExpiry: month(2032, 5) });
    await seeker(tag, { grade: "A", consultedAt: NOW, stayExpiry: month(2032, 7) });
    await seeker(tag, { grade: "A", consultedAt: NOW, stayExpiry: month(2032, 4) });
    await seeker(tag, { grade: "A", consultedAt: NOW, stayExpiry: month(2032, 9) });
    await seeker(tag, {
      grade: "A",
      consultedAt: NOW,
      status: "BLOCKED",
      stayExpiry: month(2032, 6),
    });

    // 전화 대상 리드: C/B with no next action or one due by the end of today (KST) → 3 of 7
    const { end } = kstDayRange(NOW);
    await lead(tag, { grade: "C" });
    await lead(tag, { grade: "B", nextActionAt: new Date(end.getTime() - 1) });
    await lead(tag, { grade: "C", nextActionAt: new Date(NOW.getTime() - DAY_MS) });
    await lead(tag, { grade: "C", nextActionAt: end });
    await lead(tag, { grade: "A" });
    await lead(tag, { grade: "ARCHIVED" });
    await lead(tag, { grade: "DO_NOT_CONTACT" });

    // 면접 일정: today in KST → 2 of 4
    const staff = await staffUser("STAFF_PLACEMENT");
    const s = await seeker(tag, { grade: "A", consultedAt: NOW });
    const company = await db.company.create({
      data: { nameEnc: "대시보드 테스트 기업", industryCode: "C", sido: "SEOUL" },
    });
    const rec = await db.recommendation.create({
      data: { seekerId: s.id, companyId: company.id, staffId: staff.id, note: tag },
    });
    const { start } = kstDayRange(NOW);
    for (const at of [
      start,
      new Date(end.getTime() - 60_000),
      new Date(start.getTime() - 60_000),
      end,
    ]) {
      await db.interview.create({
        data: { recommendationId: rec.id, scheduledAt: at, place: "본사" },
      });
    }

    const counts = await dashboardCounts(NOW, {
      scope: {
        seeker: seekerScope,
        lead: leadScope,
        interview: { recommendation: { note: tag } },
      },
    });
    expect(counts).toEqual({ newSeekers: 2, callLeads: 3, interviewsToday: 2, expiringSoon: 2 });

    // The same numbers straight from the rows (independent of the where builders).
    const seekers = await db.seekerProfile.findMany({ where: seekerScope });
    expect(
      seekers.filter((x) => x.grade === "B" && !x.consultedAt && x.status !== "BLOCKED").length,
    ).toBe(counts.newSeekers);
    const limit = NOW.getTime() + ADMIN_STAY_EXPIRY_SOON_DAYS * DAY_MS;
    expect(
      seekers.filter(
        (x) =>
          x.status !== "BLOCKED" &&
          x.stayExpiry != null &&
          x.stayExpiry.getTime() >= month(2032, 5).getTime() &&
          x.stayExpiry.getTime() <= limit,
      ).length,
    ).toBe(counts.expiringSoon);

    // State changes move the counts: consult one new seeker, schedule the C lead for next week.
    const fresh = seekers.find((x) => x.grade === "B" && !x.consultedAt && x.status === "ACTIVE");
    await db.seekerProfile.update({ where: { id: fresh!.id }, data: { consultedAt: NOW } });
    const c = await db.jobLead.findFirstOrThrow({
      where: { ...leadScope, grade: "C", nextActionAt: null },
    });
    await db.jobLead.update({
      where: { id: c.id },
      data: { nextActionAt: new Date(NOW.getTime() + 7 * DAY_MS) },
    });
    const after = await dashboardCounts(NOW, {
      scope: { seeker: seekerScope, lead: leadScope, interview: { recommendation: { note: tag } } },
    });
    expect(after.newSeekers).toBe(1);
    expect(after.callLeads).toBe(2);
  });

  it("R-119 / PC-4: open staff tasks are counted per role (ADMIN sees all)", async () => {
    const tag = uniq("task");
    const scope = { dedupeKey: { startsWith: tag } };
    const mk = (n: number, data: object) =>
      db.staffTask.create({
        data: { type: "LEAD_REVIEW", dedupeKey: `${tag}:${n}`, ...data },
      });
    await mk(1, { assigneeRole: "STAFF_PLACEMENT" });
    await mk(2, { assigneeRole: "STAFF_PLACEMENT", status: "IN_PROGRESS" });
    await mk(3, { assigneeRole: "STAFF_PLACEMENT", status: "DONE" });
    await mk(4, { type: "VISA_REVIEW", assigneeRole: "STAFF_VISA" });
    await mk(5, { type: "CONSULT", assigneeRole: null });

    expect(await openTaskCounts("STAFF_PLACEMENT", { scope })).toEqual([
      { type: "CONSULT", count: 1 },
      { type: "LEAD_REVIEW", count: 2 },
    ]);
    expect(await openTaskCounts("STAFF_VISA", { scope })).toEqual([
      { type: "CONSULT", count: 1 },
      { type: "VISA_REVIEW", count: 1 },
    ]);
    const all = await openTaskCounts("ADMIN", { scope });
    expect(all.reduce((n, r) => n + r.count, 0)).toBe(
      await db.staffTask.count({ where: { AND: [openTasksWhere("ADMIN"), scope] } }),
    );
    expect(all.reduce((n, r) => n + r.count, 0)).toBe(4);
  });
});
