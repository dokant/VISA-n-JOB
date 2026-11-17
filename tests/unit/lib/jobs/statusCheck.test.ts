/**
 * R-213 / WO §7.7 30일 주기 상태 확인 — time-travel tests (the clock is the handler's `now`).
 * - 30 days after the last confirmation an ACTIVE JOB_MATCH seeker gets "아직 구직 중이세요?" (SMS +
 *   e-mail) with a one-click link; not before, never twice while the check is open.
 * - Answering through the link (confirmStillSearching) closes the check.
 * - 14 days without an answer: INACTIVE, and S → A with AuditLog SEEKER_GRADE_CHANGE (actor SYSTEM).
 * - A message that reaches no channel releases the claim (retried on the next run).
 * - DECISIONS Q-27: the 14-day transition applies only to checks a real channel delivered. Console-only
 *   checks (SIMULATED) are closed without a status change; mixed (SMS console + e-mail SMTP with a mock
 *   transport) counts as real. No SMTP server is contacted.
 */
import { afterAll, describe, expect, it, vi } from "vitest";

import { SYSTEM_ACTOR } from "@/lib/audit";
import { db } from "@/lib/db";
import { type StatusCheckResult, runStatusCheck } from "@/lib/jobs/statusCheck";
import {
  type NotificationMessage,
  type NotificationProvider,
  selectNotificationProvider,
} from "@/lib/notifications";
import { createConsoleProvider } from "@/lib/notifications/console";
import { type MailTransport, createSmtpProvider } from "@/lib/notifications/smtp";
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

/** A real-channel stand-in (`delivery: "REAL"`), or a provider that delivers nothing. */
function captureProvider(ok = true) {
  const sent: NotificationMessage[] = [];
  const provider: NotificationProvider = {
    name: "capture",
    async send(message) {
      sent.push(message);
      return ok
        ? { ok: true, provider: "capture", id: String(sent.length), delivery: "REAL" }
        : { ok: false, provider: "capture", error: "DOWN", delivery: "FAILED" };
    },
  };
  return { sent, provider };
}

/** Result with every counter 0 except `over`. */
const counts = (over: Partial<StatusCheckResult> = {}): StatusCheckResult => ({
  sent: 0,
  sentSimulated: 0,
  failed: 0,
  inactivated: 0,
  demoted: 0,
  simulatedExpired: 0,
  ...over,
});

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
    expect(r).toEqual(counts({ sent: 2 }));
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
    ).toEqual(counts({ sent: 1 }));
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
    expect(await runStatusCheck(at(14), { scope, provider, siteUrl: SITE })).toEqual(counts());
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
    expect(await runStatusCheck(at(15), { scope, provider, siteUrl: SITE })).toEqual(counts());
    expect(await auditRows(s.id, "SEEKER_GRADE_CHANGE")).toHaveLength(1);
  });

  it("a message no channel accepted is not counted as sent: the claim is released and retried next run", async () => {
    const s = await seeker();
    const scope = { id: s.id };
    const down = captureProvider(false);
    expect(await runStatusCheck(T0, { scope, provider: down.provider, siteUrl: SITE })).toEqual(
      counts({ failed: 1 }),
    );
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
    const [body, sig] = token.split("~");
    const forged = `${Buffer.from(JSON.stringify({ s: s.id, t: T0.getTime(), e: 9_999_999_999 })).toString("base64url")}~${sig}`;
    expect(verifyStillSearchingToken(forged, T0)).toEqual({ ok: false, reason: "BAD_SIGNATURE" });
    expect(await stillSearchingState(forged, T0)).toBe("INVALID");
    expect(await stillSearchingState(`${body}~x`, T0)).toBe("INVALID");
    expect(await stillSearchingState("not-a-token", T0)).toBe("INVALID");
    expect(await stillSearchingState(token, at(14, -1))).toBe("ASK");
    expect(await stillSearchingState(token, at(14))).toBe("EXPIRED");
    expect(await confirmStillSearching(token, at(14))).toEqual({ ok: false, state: "EXPIRED" });
    // the link carries the profile id only — no phone, e-mail or name
    const decoded = Buffer.from(body, "base64url").toString("utf8");
    expect(Object.keys(JSON.parse(decoded)).sort()).toEqual(["e", "s", "t"]);
  });
});

// ─── DECISIONS Q-27: only a check a real channel delivered can make a seeker INACTIVE ───────────────

/** SMTP_* of a mock server: the transport below is injected, so nothing is ever connected. */
const MOCK_SMTP_ENV = {
  NODE_ENV: "test",
  SMTP_HOST: "smtp.invalid",
  SMTP_FROM: "noreply@visanjob.invalid",
};

function mockTransport(fail = false) {
  const mails: string[] = [];
  const transport: MailTransport = {
    async sendMail(mail) {
      if (fail) throw Object.assign(new Error("down"), { code: "ECONNECTION" });
      mails.push(mail.to);
      return { messageId: `<q27-${mails.length}@test>` };
    },
  };
  return { mails, transport };
}

function consoleOnly() {
  const lines: string[] = [];
  return { lines, provider: createConsoleProvider((l) => lines.push(l), undefined) };
}

describe("Q-27 status-check transition needs a real channel", () => {
  it("console only: sent and recorded as SIMULATED; 14 days later no INACTIVE, no S → A, the check is closed and asked again", async () => {
    const s = await seeker({ grade: "S", verifiedKorean: true });
    const scope = { id: s.id };
    const { lines, provider } = consoleOnly();
    const jobLog: string[] = [];
    const log = (l: string) => jobLog.push(l);

    expect(await runStatusCheck(T0, { scope, provider, siteUrl: SITE, log })).toEqual(
      counts({ sent: 1, sentSimulated: 1 }),
    );
    expect(await row(s.id)).toMatchObject({
      statusCheckSentAt: T0,
      statusCheckDeliveredReal: false,
    });
    expect(lines.map((l) => JSON.parse(l).delivery)).toEqual(["SIMULATED", "SIMULATED"]);

    // day 14: the window has passed, but nobody received the check — nothing changes
    const r = await runStatusCheck(at(14), { scope, provider, siteUrl: SITE, log });
    expect(r).toEqual(counts({ simulatedExpired: 1, sent: 1, sentSimulated: 1 }));
    expect(await row(s.id)).toMatchObject({
      status: "ACTIVE",
      grade: "S",
      statusCheckSentAt: at(14),
      statusCheckDeliveredReal: false,
    });
    expect(await auditRows(s.id, "SEEKER_GRADE_CHANGE")).toHaveLength(0);
    const warn = jobLog.map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(warn.at(-1)).toMatchObject({
      level: "warn",
      event: "status_check.simulated",
      sentSimulated: 1,
      simulatedExpired: 1,
    });
    expect(jobLog.join(" ")).not.toContain(s.id);

    // still nothing on day 28 and later
    await runStatusCheck(at(28), { scope, provider, siteUrl: SITE, log });
    await runStatusCheck(at(60), { scope, provider, siteUrl: SITE, log });
    expect(await row(s.id)).toMatchObject({ status: "ACTIVE", grade: "S" });
  });

  it("mock real channel (SMTP adapter, mock transport) delivers: 14 days later INACTIVE and S → A", async () => {
    const s = await seeker({ grade: "S", verifiedKorean: true });
    const scope = { id: s.id };
    const { mails, transport } = mockTransport();
    const smtp = createSmtpProvider(
      { host: "smtp.invalid", port: 2525, secure: false, auth: null, from: "noreply@x.invalid" },
      { transport, log: () => {} },
    );
    // the SMTP adapter alone: SMS is refused (FAILED), e-mail is REAL
    expect(await runStatusCheck(T0, { scope, provider: smtp, siteUrl: SITE })).toEqual(
      counts({ sent: 1 }),
    );
    expect(mails).toEqual([LEAK_EMAIL]);
    expect(await row(s.id)).toMatchObject({
      statusCheckSentAt: T0,
      statusCheckDeliveredReal: true,
    });

    expect(
      (await runStatusCheck(at(14, -60_000), { scope, provider: smtp, siteUrl: SITE })).inactivated,
    ).toBe(0);
    expect(await runStatusCheck(at(14), { scope, provider: smtp, siteUrl: SITE })).toEqual(
      counts({ inactivated: 1, demoted: 1 }),
    );
    expect(await row(s.id)).toMatchObject({
      status: "INACTIVE",
      grade: "A",
      statusCheckSentAt: null,
      statusCheckDeliveredReal: false,
    });
    expect((await auditRows(s.id, "SEEKER_GRADE_CHANGE")).map((x) => x.meta)).toEqual([
      { from: "S", to: "A", reason: "STATUS_CHECK_NO_REPLY", status: "INACTIVE" },
    ]);
  });

  it("mixed (SMS console + e-mail SMTP through the selected router): the transition applies", async () => {
    const s = await seeker({ grade: "S", verifiedKorean: true });
    const scope = { id: s.id };
    const { mails, transport } = mockTransport();
    const selection = selectNotificationProvider({ env: MOCK_SMTP_ENV, transport, log: () => {} });
    expect(selection.realChannels).toEqual(["EMAIL"]);
    const silence = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      expect(
        await runStatusCheck(T0, { scope, provider: selection.provider, siteUrl: SITE }),
      ).toEqual(counts({ sent: 1 }));
      expect(mails).toHaveLength(1);
      expect((await row(s.id)).statusCheckDeliveredReal).toBe(true);
      expect(
        await runStatusCheck(at(14), { scope, provider: selection.provider, siteUrl: SITE }),
      ).toEqual(counts({ inactivated: 1, demoted: 1 }));
    } finally {
      silence.mockRestore();
    }
    expect(await row(s.id)).toMatchObject({ status: "INACTIVE", grade: "A" });
  });

  it("mixed but the e-mail fails (SMS console only delivered): treated as console only — no transition", async () => {
    const s = await seeker();
    const scope = { id: s.id };
    const { transport } = mockTransport(true);
    const selection = selectNotificationProvider({ env: MOCK_SMTP_ENV, transport, log: () => {} });
    const silence = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      expect(
        await runStatusCheck(T0, {
          scope,
          provider: selection.provider,
          siteUrl: SITE,
          log: () => {},
        }),
      ).toEqual(counts({ sent: 1, sentSimulated: 1 }));
      expect(
        (
          await runStatusCheck(at(14), {
            scope,
            provider: selection.provider,
            siteUrl: SITE,
            log: () => {},
          })
        ).inactivated,
      ).toBe(0);
    } finally {
      silence.mockRestore();
    }
    expect((await row(s.id)).status).toBe("ACTIVE");
  });

  it("an answer resets the record; a real check after a console one counts as real", async () => {
    const s = await seeker();
    const scope = { id: s.id };
    const { provider } = consoleOnly();
    await runStatusCheck(T0, { scope, provider, siteUrl: SITE, log: () => {} });
    // day 14: the console check is closed and a real one goes out (SMTP configured meanwhile)
    const real = captureProvider();
    await runStatusCheck(at(14), { scope, provider: real.provider, siteUrl: SITE, log: () => {} });
    expect(await row(s.id)).toMatchObject({
      status: "ACTIVE",
      statusCheckSentAt: at(14),
      statusCheckDeliveredReal: true,
    });
    expect(await confirmStillSearching(tokenOf(real.sent[0]), at(15))).toEqual({ ok: true });
    expect(await row(s.id)).toMatchObject({
      statusCheckSentAt: null,
      statusCheckDeliveredReal: false,
    });
  });
});
