/**
 * R-214: NotificationProvider adapters and their selection.
 * - Console adapter: every channel, one JSON line, masked recipient (formal tests in console.test.ts).
 * - SMTP adapter: only when SMTP_HOST / SMTP_FROM are set; without them it is never created and no
 *   transport is built (no connection, no send). The choice is logged without secrets.
 * - No real SMTP server is contacted: tests use a mock transport or nodemailer's in-process
 *   `jsonTransport`.
 */
import nodemailer from "nodemailer";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createChannelRouter,
  getNotificationProvider,
  selectNotificationProvider,
} from "@/lib/notifications";
import { createConsoleProvider } from "@/lib/notifications/console";
import { TemplateMissingError, renderEmail, renderText } from "@/lib/notifications/render";
import {
  type MailTransport,
  createSmtpProvider,
  smtpConfigFromEnv,
} from "@/lib/notifications/smtp";
import type { NotificationMessage } from "@/lib/notifications/types";

afterEach(() => vi.restoreAllMocks());

const SMTP_ENV = {
  SMTP_HOST: "smtp.invalid",
  SMTP_PORT: "2525",
  SMTP_USER: "mailer",
  SMTP_PASS: "not-a-real-secret",
  SMTP_FROM: "noreply@visanjob.invalid",
};

const email: NotificationMessage = {
  channel: "EMAIL",
  to: "seeker@example.com",
  templateKey: "common.statusCheck.email",
  locale: "ko",
  params: { url: "https://visanjob.invalid/ko/seeker/still-searching/t", days: 14 },
};

function mockTransport() {
  const sent: Parameters<MailTransport["sendMail"]>[0][] = [];
  const transport: MailTransport = {
    sendMail: vi.fn(async (mail) => {
      sent.push(mail);
      return { messageId: `<m${sent.length}@test>` };
    }),
  };
  return { sent, transport };
}

describe("R-214 smtpConfigFromEnv", () => {
  it("is disabled without SMTP_HOST or SMTP_FROM, or with half the credentials", () => {
    expect(smtpConfigFromEnv({})).toEqual({ enabled: false, reason: "SMTP_HOST_UNSET" });
    expect(smtpConfigFromEnv({ SMTP_HOST: "  " })).toEqual({
      enabled: false,
      reason: "SMTP_HOST_UNSET",
    });
    expect(smtpConfigFromEnv({ SMTP_HOST: "smtp.invalid" })).toEqual({
      enabled: false,
      reason: "SMTP_FROM_UNSET",
    });
    expect(smtpConfigFromEnv({ ...SMTP_ENV, SMTP_PASS: "" })).toEqual({
      enabled: false,
      reason: "SMTP_AUTH_INCOMPLETE",
    });
    expect(smtpConfigFromEnv({ ...SMTP_ENV, SMTP_PORT: "70000" })).toEqual({
      enabled: false,
      reason: "SMTP_PORT_INVALID",
    });
  });

  it("is enabled with host + from (default ports 587 / 465 with SMTP_SECURE)", () => {
    expect(smtpConfigFromEnv(SMTP_ENV)).toEqual({
      enabled: true,
      config: {
        host: "smtp.invalid",
        port: 2525,
        secure: false,
        auth: { user: "mailer", pass: "not-a-real-secret" },
        from: "noreply@visanjob.invalid",
      },
    });
    const noAuth = smtpConfigFromEnv({ SMTP_HOST: "h.invalid", SMTP_FROM: "a@b.invalid" });
    expect(noAuth.enabled && noAuth.config).toMatchObject({ port: 587, secure: false, auth: null });
    const secure = smtpConfigFromEnv({
      SMTP_HOST: "h.invalid",
      SMTP_FROM: "a@b.invalid",
      SMTP_SECURE: "true",
    });
    expect(secure.enabled && secure.config).toMatchObject({ port: 465, secure: true });
  });
});

describe("R-214 selectNotificationProvider", () => {
  it("without SMTP_*: console for every channel, no transport is built, nothing is sent by SMTP", async () => {
    const createTransport = vi.spyOn(nodemailer, "createTransport");
    const logs: string[] = [];
    const selection = selectNotificationProvider({
      env: { NODE_ENV: "test" },
      log: (l) => logs.push(l),
    });
    expect(selection.smtp).toBe("disabled");
    expect(selection.reason).toBe("SMTP_HOST_UNSET");
    expect(selection.routes).toEqual({ EMAIL: "console", SMS: "console", STAFF: "console" });
    expect(selection.provider.name).toBe("console");
    // the choice is logged once, as JSON, without secrets
    expect(logs).toHaveLength(1);
    expect(JSON.parse(logs[0])).toMatchObject({
      event: "notification.provider",
      smtp: "disabled",
      reason: "SMTP_HOST_UNSET",
      routes: { EMAIL: "console" },
    });
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const r = await selection.provider.send(email);
    expect(r).toMatchObject({ ok: true, provider: "console" });
    expect(createTransport).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledTimes(1);
  });

  it("with SMTP_*: EMAIL goes to the SMTP adapter, SMS and STAFF stay on the console", async () => {
    const { sent, transport } = mockTransport();
    const logs: string[] = [];
    const selection = selectNotificationProvider({
      env: { ...SMTP_ENV, NODE_ENV: "test" },
      log: (l) => logs.push(l),
      transport,
    });
    expect(selection.smtp).toBe("enabled");
    expect(selection.routes).toEqual({ EMAIL: "smtp", SMS: "console", STAFF: "console" });
    expect(selection.provider.name).toBe("channel-router");
    const startLog = logs.join("\n");
    for (const secret of ["smtp.invalid", "mailer", "not-a-real-secret"]) {
      expect(startLog).not.toContain(secret);
    }

    const r = await selection.provider.send(email);
    expect(r).toEqual({ ok: true, provider: "smtp", id: "<m1@test>" });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      from: "noreply@visanjob.invalid",
      to: "seeker@example.com",
      subject: "[비자앤잡] 아직 일자리를 찾고 계신가요?",
    });
    expect(sent[0].text).toContain("https://visanjob.invalid/ko/seeker/still-searching/t");
    expect(sent[0].text).toContain("14일");

    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const sms = await selection.provider.send({
      channel: "SMS",
      to: "+821012345678",
      templateKey: "common.statusCheck.sms",
      locale: "ko",
      params: { url: "u", days: 14 },
    });
    expect(sms).toMatchObject({ ok: true, provider: "console" });
    expect(sent).toHaveLength(1);
    expect(info).toHaveBeenCalledTimes(1);
  });

  it("getNotificationProvider is cached; the test environment has no SMTP_* (console only)", () => {
    expect(process.env.SMTP_HOST ?? "").toBe("");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const p = getNotificationProvider();
    expect(p.name).toBe("console");
    expect(getNotificationProvider()).toBe(p);
    info.mockRestore();
  });

  it("createChannelRouter returns the single provider when every channel shares it", () => {
    const c = createConsoleProvider(() => {}, "test");
    expect(createChannelRouter({ EMAIL: c, SMS: c, STAFF: c })).toBe(c);
  });
});

describe("R-214 SMTP adapter", () => {
  const parsed = smtpConfigFromEnv(SMTP_ENV);
  if (!parsed.enabled) throw new Error("test SMTP config must be enabled");
  const config = parsed;

  it("renders subject and body from messages in the seeker's locale through nodemailer (in-process jsonTransport)", async () => {
    const transport = nodemailer.createTransport({ jsonTransport: true });
    const logs: string[] = [];
    const provider = createSmtpProvider(config.config, { transport, log: (l) => logs.push(l) });
    const r = await provider.send({ ...email, locale: "vi" });
    expect(r.ok).toBe(true);
    expect(logs).toHaveLength(1);
    const line = JSON.parse(logs[0]) as Record<string, unknown>;
    expect(line).toMatchObject({ provider: "smtp", ok: true, to: "***om", locale: "vi" });
    // the log never carries the address, subject or body
    expect(logs[0]).not.toContain("seeker@example.com");
    expect(logs[0]).not.toContain("still-searching");
  });

  it("refuses other channels and missing templates without sending; a transport error is a result, not a throw", async () => {
    const { sent, transport } = mockTransport();
    const provider = createSmtpProvider(config.config, { transport, log: () => {} });
    expect(await provider.send({ ...email, channel: "SMS" })).toEqual({
      ok: false,
      provider: "smtp",
      error: "CHANNEL_UNSUPPORTED",
    });
    expect(await provider.send({ ...email, templateKey: "common.nothing.email" })).toEqual({
      ok: false,
      provider: "smtp",
      error: "TEMPLATE_MISSING",
    });
    expect(sent).toHaveLength(0);

    const logs: string[] = [];
    const failing = createSmtpProvider(config.config, {
      transport: {
        sendMail: async () => {
          throw Object.assign(new Error("550 rejected seeker@example.com"), { code: "EENVELOPE" });
        },
      },
      log: (l) => logs.push(l),
    });
    expect(await failing.send(email)).toEqual({
      ok: false,
      provider: "smtp",
      error: "SEND_FAILED",
    });
    expect(JSON.parse(logs[0])).toMatchObject({ ok: false, error: "EENVELOPE" });
    expect(logs[0]).not.toContain("seeker@example.com");
  });
});

describe("R-214 / R-213 notification templates", () => {
  it("every R-213 template renders in all six locales with its ICU arguments", () => {
    for (const locale of ["ko", "en", "vi", "ru", "zh", "uz"] as const) {
      for (const topic of ["common.statusCheck", "common.stayExpiry"]) {
        const params = { url: "https://x.invalid/p", days: 30 };
        const sms = renderText({
          channel: "SMS",
          to: "x",
          templateKey: `${topic}.sms`,
          locale,
          params,
        });
        expect(sms.text).toContain("https://x.invalid/p");
        expect(sms.text).toContain("30");
        const mail = renderEmail({
          channel: "EMAIL",
          to: "x",
          templateKey: `${topic}.email`,
          locale,
          params,
        });
        expect(mail.subject.length).toBeGreaterThan(0);
        expect(mail.text).toContain("https://x.invalid/p");
        expect(mail.text).not.toMatch(/\{(url|days)\}/);
      }
    }
    expect(() =>
      renderText({ channel: "SMS", to: "x", templateKey: "common.missing.sms", locale: "ko" }),
    ).toThrow(TemplateMissingError);
  });
});
