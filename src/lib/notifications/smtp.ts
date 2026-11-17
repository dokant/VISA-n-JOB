/**
 * SMTP e-mail adapter (PRD R-214, WO §3 "알림 어댑터(이메일)", PLAN P2d 작업 1).
 *
 * - Enabled only when the SMTP_* environment variables are set (`smtpConfigFromEnv`). Without them
 *   the adapter is never created, so no connection or send is ever attempted (index.ts falls back
 *   to the console adapter). Real credentials and the first real send need a person (PLAN A-3).
 * - Delivers EMAIL messages only; other channels answer `CHANNEL_UNSUPPORTED`. An accepted message is
 *   `delivery: "REAL"` (DECISIONS Q-27).
 * - The subject and body come from messages/*.json (`{templateKey}.subject` / `.body`, render.ts).
 * - Logs one JSON line per send without the address, subject or body (STANDARD 5, 4.7): only the
 *   masked recipient, the template key and the outcome.
 * - Tests inject a mock transport (`options.transport`); nodemailer's network transport is only
 *   built from a real config.
 */
import nodemailer from "nodemailer";

import { maskRecipient } from "./console";
import { renderEmail } from "./render";
import type { NotificationMessage, NotificationProvider, SendResult } from "./types";

export type SmtpConfig = {
  host: string;
  port: number;
  /** true = TLS from the start (port 465); false = STARTTLS when offered. */
  secure: boolean;
  auth: { user: string; pass: string } | null;
  from: string;
};

export type SmtpConfigResult =
  | { enabled: true; config: SmtpConfig }
  | {
      enabled: false;
      reason: "SMTP_HOST_UNSET" | "SMTP_FROM_UNSET" | "SMTP_AUTH_INCOMPLETE" | "SMTP_PORT_INVALID";
    };

type Env = Readonly<Record<string, string | undefined>>;

const DEFAULT_PORT = 587;
const SECURE_PORT = 465;

function value(env: Env, key: string): string {
  return (env[key] ?? "").trim();
}

/** Reads SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM. */
export function smtpConfigFromEnv(env: Env = process.env): SmtpConfigResult {
  const host = value(env, "SMTP_HOST");
  if (host === "") return { enabled: false, reason: "SMTP_HOST_UNSET" };
  const from = value(env, "SMTP_FROM");
  if (from === "") return { enabled: false, reason: "SMTP_FROM_UNSET" };
  const user = value(env, "SMTP_USER");
  const pass = value(env, "SMTP_PASS");
  if ((user === "") !== (pass === "")) return { enabled: false, reason: "SMTP_AUTH_INCOMPLETE" };
  const secure = value(env, "SMTP_SECURE") === "true";
  const portText = value(env, "SMTP_PORT");
  const port = portText === "" ? (secure ? SECURE_PORT : DEFAULT_PORT) : Number(portText);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    return { enabled: false, reason: "SMTP_PORT_INVALID" };
  }
  return {
    enabled: true,
    config: { host, port, secure, auth: user ? { user, pass } : null, from },
  };
}

/** The part of a nodemailer transport the adapter uses (a mock in tests). */
export type MailTransport = {
  sendMail(mail: {
    from: string;
    to: string;
    subject: string;
    text: string;
  }): Promise<{ messageId?: string }>;
};

export type LogLine = (line: string) => void;

/**
 * The default log sink (STANDARD 4.7 v2.22): a JSON line with `level: "warn"` or `"error"` goes to
 * console.warn, any other line to console.info. Shared by `createSmtpProvider` and
 * `selectNotificationProvider` so a failed send is a warning on every path (QA P2e D-1).
 */
export const logByLevel: LogLine = (line) => {
  let level: unknown;
  try {
    level = (JSON.parse(line) as { level?: unknown }).level;
  } catch {
    level = undefined;
  }
  if (level === "warn" || level === "error") console.warn(line);
  else console.info(line);
};

function buildTransport(config: SmtpConfig): MailTransport {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    ...(config.auth ? { auth: config.auth } : {}),
  });
}

export function createSmtpProvider(
  config: SmtpConfig,
  options: { transport?: MailTransport; log?: LogLine } = {},
): NotificationProvider {
  let transport = options.transport ?? null;
  const record = (message: NotificationMessage, outcome: Record<string, unknown>) => {
    const line = JSON.stringify({
      level: outcome.ok ? "info" : "warn",
      event: "notification.send",
      provider: "smtp",
      channel: message.channel,
      to: maskRecipient(message.to),
      templateKey: message.templateKey,
      locale: message.locale,
      ...outcome,
    });
    // Default sink by level: a failed send (`level: "warn"`) goes to console.warn.
    (options.log ?? logByLevel)(line);
  };
  return {
    name: "smtp",
    async send(message: NotificationMessage): Promise<SendResult> {
      if (message.channel !== "EMAIL") {
        record(message, { ok: false, error: "CHANNEL_UNSUPPORTED" });
        return { ok: false, provider: "smtp", error: "CHANNEL_UNSUPPORTED", delivery: "FAILED" };
      }
      let mail: { subject: string; text: string };
      try {
        mail = renderEmail(message);
      } catch {
        record(message, { ok: false, error: "TEMPLATE_MISSING" });
        return { ok: false, provider: "smtp", error: "TEMPLATE_MISSING", delivery: "FAILED" };
      }
      try {
        transport ??= buildTransport(config);
        const info = await transport.sendMail({
          from: config.from,
          to: message.to,
          subject: mail.subject,
          text: mail.text,
        });
        const id = info.messageId ?? "";
        record(message, { ok: true, id });
        return { ok: true, provider: "smtp", id, delivery: "REAL" };
      } catch (e) {
        // The error text can carry server replies with addresses: log only its class / code.
        const code =
          e !== null && typeof e === "object" && "code" in e && typeof e.code === "string"
            ? e.code
            : "SEND_FAILED";
        record(message, { ok: false, error: code });
        return { ok: false, provider: "smtp", error: "SEND_FAILED", delivery: "FAILED" };
      }
    },
  };
}
