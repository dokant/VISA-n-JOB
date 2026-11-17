/**
 * R-213 / WO §7.7 체류 만료 알림 D-90 / D-60 / D-30 + 행정사 업무 (StaffTask, PC-4 / C-4) —
 * time-travel tests on Korean calendar days (the clock is the handler's `now`).
 * Boundary: D-91 nothing, D-90 the first notice + task, D-89 no repeat (a seeker first seen at D-89
 * still gets the missed D-90 step once). The KST date flips at 15:00 UTC.
 */
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  daysUntil,
  kstToday,
  runStayExpiryAlerts,
  stayAlertStep,
  stayExpiryDedupeKey,
} from "@/lib/jobs/stayExpiry";
import type { NotificationMessage, NotificationProvider } from "@/lib/notifications";

import { LEAK_EMAIL, candidate, tag } from "../candidates/candidateFixtures";

afterAll(() => db.$disconnect());

const DAY = 86_400_000;
const SITE = "https://visanjob.test";
/** Stored expiry month (the 1st, 00:00 UTC). */
const EXPIRY = new Date("2027-03-01T00:00:00.000Z");
/** 00:00 KST on the day that is `n` days before the expiry day. */
const kstMidnightBefore = (n: number) => new Date(EXPIRY.getTime() - n * DAY - 9 * 3_600_000);

function captureProvider() {
  const sent: NotificationMessage[] = [];
  const provider: NotificationProvider = {
    name: "capture",
    async send(m) {
      sent.push(m);
      return { ok: true, provider: "capture", id: String(sent.length) };
    },
  };
  return { sent, provider };
}

function tasksOf(seekerId: string) {
  return db.staffTask.findMany({
    where: { seekerId, type: "STAY_EXPIRY" },
    orderBy: { createdAt: "asc" },
  });
}

describe("R-213 stay expiry reminders", () => {
  it("day arithmetic is in Korean calendar days; steps are D-90 (90…61), D-60 (60…31), D-30 (30…1)", () => {
    expect(kstToday(new Date("2026-11-30T14:59:59.999Z")).toISOString()).toBe(
      "2026-11-30T00:00:00.000Z",
    );
    expect(kstToday(new Date("2026-11-30T15:00:00.000Z")).toISOString()).toBe(
      "2026-12-01T00:00:00.000Z",
    );
    expect(daysUntil(EXPIRY, kstMidnightBefore(91))).toBe(91);
    expect(daysUntil(EXPIRY, new Date(kstMidnightBefore(90).getTime() - 1))).toBe(91);
    expect(daysUntil(EXPIRY, kstMidnightBefore(90))).toBe(90);
    expect(daysUntil(EXPIRY, kstMidnightBefore(89))).toBe(89);
    const steps = [91, 90, 89, 61, 60, 59, 31, 30, 29, 1, 0, -1].map((d) => [d, stayAlertStep(d)]);
    expect(steps).toEqual([
      [91, null],
      [90, 90],
      [89, 90],
      [61, 90],
      [60, 60],
      [59, 60],
      [31, 60],
      [30, 30],
      [29, 30],
      [1, 30],
      [0, null],
      [-1, null],
    ]);
  });

  it("D-91 nothing; D-90 notice + STAFF_VISA task; D-89 no repeat; D-60 and D-30 once each; expired nothing", async () => {
    const s = await candidate(tag("se"), { stayExpiry: EXPIRY, stayAlertOptIn: true });
    const scope = { id: s.id };
    const { sent, provider } = captureProvider();
    const run = (now: Date) => runStayExpiryAlerts(now, { scope, provider, siteUrl: SITE });

    // D-91, one millisecond before 00:00 KST of D-90
    expect(await run(new Date(kstMidnightBefore(90).getTime() - 1))).toEqual({
      tasks: 0,
      notified: 0,
      notifyFailed: 0,
    });
    expect(await tasksOf(s.id)).toHaveLength(0);

    // D-90 (00:00 KST)
    expect(await run(kstMidnightBefore(90))).toEqual({ tasks: 1, notified: 1, notifyFailed: 0 });
    const [task] = await tasksOf(s.id);
    expect(task).toMatchObject({
      type: "STAY_EXPIRY",
      status: "OPEN",
      assigneeRole: "STAFF_VISA",
      dueAt: EXPIRY,
      dedupeKey: stayExpiryDedupeKey(s.id, EXPIRY, 90),
      payload: { step: 90, daysLeft: 90, optIn: true, notified: true },
    });
    expect(sent.map((m) => [m.channel, m.templateKey, m.params?.days])).toEqual([
      ["SMS", "common.stayExpiry.sms", 90],
      ["EMAIL", "common.stayExpiry.email", 90],
    ]);
    expect(sent[1].to).toBe(LEAK_EMAIL);
    expect(sent[0].params?.url).toBe(`${SITE}/ko/seeker/me/stay`);

    // D-89 and the same day again: nothing new
    expect((await run(kstMidnightBefore(89))).tasks).toBe(0);
    expect((await run(new Date(kstMidnightBefore(90).getTime() + 3_600_000))).tasks).toBe(0);
    expect(await tasksOf(s.id)).toHaveLength(1);

    // D-61 nothing, D-60 the second step, D-31 nothing, D-30 the third, D-1 nothing, D-0 nothing
    expect((await run(kstMidnightBefore(61))).tasks).toBe(0);
    expect((await run(kstMidnightBefore(60))).tasks).toBe(1);
    expect((await run(kstMidnightBefore(31))).tasks).toBe(0);
    expect((await run(kstMidnightBefore(30))).tasks).toBe(1);
    expect((await run(kstMidnightBefore(1))).tasks).toBe(0);
    expect((await run(kstMidnightBefore(0))).tasks).toBe(0);
    const all = await tasksOf(s.id);
    expect(all.map((t) => (t.payload as { step: number }).step)).toEqual([90, 60, 30]);
    expect(sent.filter((m) => m.channel === "SMS").map((m) => m.params?.days)).toEqual([
      90, 60, 30,
    ]);
  });

  it("first seen at D-89: the missed D-90 step once (days left 89); a new expiry starts a new series", async () => {
    const s = await candidate(tag("se"), { stayExpiry: EXPIRY, stayAlertOptIn: true });
    const scope = { id: s.id };
    const { sent, provider } = captureProvider();
    const r = await runStayExpiryAlerts(kstMidnightBefore(89), { scope, provider, siteUrl: SITE });
    expect(r.tasks).toBe(1);
    expect((await tasksOf(s.id))[0].payload).toMatchObject({ step: 90, daysLeft: 89 });
    expect(sent[0].params?.days).toBe(89);

    // 연장: the seeker saves a later expiry month → its own D-90 later
    const later = new Date("2027-09-01T00:00:00.000Z");
    await db.seekerProfile.update({ where: { id: s.id }, data: { stayExpiry: later } });
    const atLaterD90 = new Date(later.getTime() - 90 * DAY - 9 * 3_600_000);
    expect((await runStayExpiryAlerts(atLaterD90, { scope, provider, siteUrl: SITE })).tasks).toBe(
      1,
    );
    expect((await tasksOf(s.id)).map((t) => t.dedupeKey)).toEqual([
      stayExpiryDedupeKey(s.id, EXPIRY, 90),
      stayExpiryDedupeKey(s.id, later, 90),
    ]);
  });

  it("without the reminder opt-in: the 행정사 task only, no message; BLOCKED seekers and no expiry are skipped", async () => {
    const quiet = await candidate(tag("se"), { stayExpiry: EXPIRY, stayAlertOptIn: false });
    const blocked = await candidate(tag("se"), {
      stayExpiry: EXPIRY,
      stayAlertOptIn: true,
      status: "BLOCKED",
    });
    // grade B: never an employer-visible candidate (a seeker without expiry would count in every
    // future-dated candidate statistic of other test files)
    const none = await candidate(tag("se"), { stayExpiry: null, stayAlertOptIn: true, grade: "B" });
    const { sent, provider } = captureProvider();
    const r = await runStayExpiryAlerts(kstMidnightBefore(90), {
      scope: { id: { in: [quiet.id, blocked.id, none.id] } },
      provider,
      siteUrl: SITE,
    });
    expect(r).toEqual({ tasks: 1, notified: 0, notifyFailed: 0 });
    expect(sent).toHaveLength(0);
    expect((await tasksOf(quiet.id))[0].payload).toMatchObject({ optIn: false, notified: false });
    expect(await tasksOf(blocked.id)).toHaveLength(0);
    expect(await tasksOf(none.id)).toHaveLength(0);
  });
});
