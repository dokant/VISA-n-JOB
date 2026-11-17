/**
 * R-213 / WO §7.7 30일 주기 상태 확인 — time-travel tests (the clock is the handler's `now`).
 * - 30 days after the last confirmation an ACTIVE JOB_MATCH seeker gets "아직 구직 중이세요?" (SMS +
 *   e-mail) with a one-click link; not before, never twice while the check is open.
 * - Answering through the link (confirmStillSearching) closes the check.
 * - 14 days without an answer: INACTIVE, and S → A with AuditLog SEEKER_GRADE_CHANGE (actor SYSTEM).
 * - A message that reaches no channel releases the claim (retried on the next run).
 */
import { afterAll, describe, expect, it } from "vitest";

import { SYSTEM_ACTOR } from "@/lib/audit";
import { db } from "@/lib/db";
import { runStatusCheck } from "@/lib/jobs/statusCheck";
import type { NotificationMessage, NotificationProvider } from "@/lib/notifications";
import {
  confirmStillSearching,
  stillSearchingState,
  verifyStillSearchingToken,
} from "@/lib/seeker/stillSearching";

import { auditRows } from "../admin/adminFixtures";
import { LEAK_EMAIL, candidate, tag } from "../candidates/candidateFixtures";

afterAll(() => db.$disconnect());

const DAY = 86_400_000;
const SITE = "https://visanjob.test";
/** 2026-12-01 10:00 KST (the scheduled time of the job). */
const T0 = new Date("2026-12-01T01:00:00.000Z");
const at = (days: number, ms = 0) => new Date(T0.getTime() + days * DAY + ms);

function captureProvider(ok = true) {
  const sent: NotificationMessage[] = [];
  const provider: NotificationProvider = {
    name: "capture",
    async send(message) {
      sent.push(message);
      return ok
        ? { ok: true, provider: "capture", id: String(sent.length) }
        : { ok: false, provider: "capture", error: "DOWN" };
    },
  };
  return { sent, provider };
}

async function seeker(over: Parameters<typeof candidate>[1] = {}) {
  return candidate(tag("sc"), { lastActiveConfirmedAt: at(-30), ...over });
}

const row = (id: string) => db.seekerProfile.findUniqueOrThrow({ where: { id } });

function tokenOf(message: NotificationMessage): string {
  const url = String(message.params?.url ?? "");
  const m = url.match(/\/ko\/seeker\/still-searching\/([^/]+)$/);
  if (!m) throw new Error(`no link in ${url}`);
  return m[1];
}

describe("R-213 30-day status check", () => {
  it("sends on day 30 (not 29 d 23 h), to ACTIVE JOB_MATCH seekers still looking, once per open check", async () => {
    const due = await seeker();
    const almost = await seeker({ lastActiveConfirmedAt: at(-30, 3_600_000) });
    const notSearching = await seeker({ jobSearchStatus: "NOT_SEARCHING" });
    const futurePool = await seeker({ track: "FUTURE_POOL" });
    const inactive = await seeker({ status: "INACTIVE" });
    const quickNoStatus = await seeker({ jobSearchStatus: null });
    const ids = [due, almost, notSearching, futurePool, inactive, quickNoStatus].map((s) => s.id);
    const scope = { id: { in: ids } };
    const { sent, provider } = captureProvider();

    const r = await runStatusCheck(T0, { scope, provider, siteUrl: SITE });
    expect(r).toEqual({ sent: 2, failed: 0, inactivated: 0, demoted: 0 });
    expect((await row(due.id)).statusCheckSentAt).toEqual(T0);
    expect((await row(quickNoStatus.id)).statusCheckSentAt).toEqual(T0);
    for (const s of [almost, notSearching, futurePool, inactive]) {
      expect((await row(s.id)).statusCheckSentAt).toBeNull();
    }

    // SMS to the phone and e-mail to the profile address, same link, 14-day window in the text
    const forDue = sent.filter((m) => tokenOf(m) && verifyStillSearchingToken(tokenOf(m), T0).ok);
    expect(sent.map((m) => m.channel).sort()).toEqual(["EMAIL", "EMAIL", "SMS", "SMS"]);
    expect(sent.find((m) => m.channel === "EMAIL")).toMatchObject({
      to: LEAK_EMAIL,
      templateKey: "common.statusCheck.email",
      locale: "ko",
      params: { days: 14 },
    });
    expect(sent.find((m) => m.channel === "SMS")?.templateKey).toBe("common.statusCheck.sms");
    expect(forDue).toHaveLength(4);
    for (const m of sent) expect(String(m.params?.url)).toMatch(/^https:\/\/visanjob\.test\/ko\//);

    // the same day again, and an hour later for the "almost" seeker: nothing new for the open checks
    const again = captureProvider();
    expect(
      await runStatusCheck(at(0, 3_600_000), {
        scope,
        provider: again.provider,
        siteUrl: SITE,
      }),
    ).toEqual({ sent: 1, failed: 0, inactivated: 0, demoted: 0 });
    expect(again.sent.every((m) => tokenOf(m))).toBe(true);
    expect((await row(almost.id)).statusCheckSentAt).toEqual(at(0, 3_600_000));
  });

  it("an answer through the link closes the check: no INACTIVE on day 14, the next check 30 days after the answer", async () => {
    const s = await seeker({ grade: "S", verifiedKorean: true });
    const scope = { id: s.id };
    const { sent, provider } = captureProvider();
    await runStatusCheck(T0, { scope, provider, siteUrl: SITE });
    const token = tokenOf(sent[0]);
    expect(await stillSearchingState(token, at(1))).toBe("ASK");

    expect(await confirmStillSearching(token, at(3))).toEqual({ ok: true });
    const answered = await row(s.id);
    expect(answered.lastActiveConfirmedAt).toEqual(at(3));
    expect(answered.statusCheckSentAt).toBeNull();
    // the token works once
    expect(await confirmStillSearching(token, at(4))).toEqual({ ok: false, state: "ANSWERED" });
    expect(await stillSearchingState(token, at(4))).toBe("ANSWERED");

    // day 14: still ACTIVE and S
    expect(await runStatusCheck(at(14), { scope, provider, siteUrl: SITE })).toEqual({
      sent: 0,
      failed: 0,
      inactivated: 0,
      demoted: 0,
    });
    expect(await row(s.id)).toMatchObject({ status: "ACTIVE", grade: "S" });
    // next check: 30 days after the answer (day 33), not on day 32
    expect((await runStatusCheck(at(32), { scope, provider, siteUrl: SITE })).sent).toBe(0);
    expect((await runStatusCheck(at(33), { scope, provider, siteUrl: SITE })).sent).toBe(1);
  });

  it("14 days without an answer: INACTIVE at 14 d (not 13 d 23 h 59 m); S → A with SEEKER_GRADE_CHANGE, A stays A", async () => {
    const s = await seeker({ grade: "S", verifiedKorean: true });
    const a = await seeker();
    const scope = { id: { in: [s.id, a.id] } };
    const { sent, provider } = captureProvider();
    await runStatusCheck(T0, { scope, provider, siteUrl: SITE });

    const before = await runStatusCheck(at(14, -60_000), { scope, provider, siteUrl: SITE });
    expect(before.inactivated).toBe(0);
    expect(await row(s.id)).toMatchObject({ status: "ACTIVE", grade: "S" });

    const r = await runStatusCheck(at(14), { scope, provider, siteUrl: SITE });
    expect(r).toMatchObject({ inactivated: 2, demoted: 1, sent: 0 });
    expect(await row(s.id)).toMatchObject({
      status: "INACTIVE",
      grade: "A",
      statusCheckSentAt: null,
    });
    expect(await row(a.id)).toMatchObject({
      status: "INACTIVE",
      grade: "A",
      statusCheckSentAt: null,
    });

    const audit = await auditRows(s.id, "SEEKER_GRADE_CHANGE");
    expect(audit.map((x) => [x.actorId, x.meta])).toEqual([
      [SYSTEM_ACTOR, { from: "S", to: "A", reason: "STATUS_CHECK_NO_REPLY", status: "INACTIVE" }],
    ]);
    expect(await auditRows(a.id, "SEEKER_GRADE_CHANGE")).toHaveLength(0);

    // the late answer changes nothing; the link says the period has passed
    const token = tokenOf(sent.find((m) => m.channel === "SMS" && m.to)!);
    expect(await stillSearchingState(token, at(14))).toBe("EXPIRED");
    expect((await confirmStillSearching(token, at(15))).ok).toBe(false);
    // running again changes nothing (no double demotion, no message to INACTIVE seekers)
    expect(await runStatusCheck(at(15), { scope, provider, siteUrl: SITE })).toEqual({
      sent: 0,
      failed: 0,
      inactivated: 0,
      demoted: 0,
    });
    expect(await auditRows(s.id, "SEEKER_GRADE_CHANGE")).toHaveLength(1);
  });

  it("a message no channel accepted is not counted as sent: the claim is released and retried next run", async () => {
    const s = await seeker();
    const scope = { id: s.id };
    const down = captureProvider(false);
    expect(await runStatusCheck(T0, { scope, provider: down.provider, siteUrl: SITE })).toEqual({
      sent: 0,
      failed: 1,
      inactivated: 0,
      demoted: 0,
    });
    expect((await row(s.id)).statusCheckSentAt).toBeNull();
    // 14 days later the seeker is not made INACTIVE (no check was delivered) but asked again
    const up = captureProvider();
    const r = await runStatusCheck(at(14), { scope, provider: up.provider, siteUrl: SITE });
    expect(r).toMatchObject({ sent: 1, inactivated: 0 });
    expect(await row(s.id)).toMatchObject({ status: "ACTIVE", statusCheckSentAt: at(14) });
  });

  it("tokens: tampered or foreign tokens are INVALID; the page state is EXPIRED after 14 days", async () => {
    const s = await seeker();
    const { sent, provider } = captureProvider();
    await runStatusCheck(T0, { scope: { id: s.id }, provider, siteUrl: SITE });
    const token = tokenOf(sent[0]);
    const [body, sig] = token.split(".");
    const forged = `${Buffer.from(JSON.stringify({ s: s.id, t: T0.getTime(), e: 9_999_999_999 })).toString("base64url")}.${sig}`;
    expect(verifyStillSearchingToken(forged, T0)).toEqual({ ok: false, reason: "BAD_SIGNATURE" });
    expect(await stillSearchingState(forged, T0)).toBe("INVALID");
    expect(await stillSearchingState(`${body}.x`, T0)).toBe("INVALID");
    expect(await stillSearchingState("not-a-token", T0)).toBe("INVALID");
    expect(await stillSearchingState(token, at(14, -1))).toBe("ASK");
    expect(await stillSearchingState(token, at(14))).toBe("EXPIRED");
    expect(await confirmStillSearching(token, at(14))).toEqual({ ok: false, state: "EXPIRED" });
    // the link carries the profile id only — no phone, e-mail or name
    const decoded = Buffer.from(body, "base64url").toString("utf8");
    expect(Object.keys(JSON.parse(decoded)).sort()).toEqual(["e", "s", "t"]);
  });
});
