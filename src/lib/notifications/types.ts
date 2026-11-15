/**
 * Notification provider interface (PLAN P0c-6; prerequisite of R-105 OTP and R-203 staff alerts).
 * Minimal on purpose: the SMTP adapter and the formal provider tests come in P2d (R-214).
 *
 * Messages carry a template key + params, not rendered copy: the provider (or a later renderer)
 * resolves the localized text from messages/*.json.
 */
import type { Locale } from "@/i18n/locales";

export type NotificationChannel = "SMS" | "EMAIL" | "STAFF";

export type NotificationMessage = {
  channel: NotificationChannel;
  /** Phone (E.164), e-mail address, or staff user id. Treated as PII: never logged in full. */
  to: string;
  /** messages key, e.g. "notifications.otp" */
  templateKey: string;
  locale: Locale;
  params?: Readonly<Record<string, string | number>>;
};

export type SendResult =
  { ok: true; provider: string; id: string } | { ok: false; provider: string; error: string };

export interface NotificationProvider {
  readonly name: string;
  send(message: NotificationMessage): Promise<SendResult>;
}
