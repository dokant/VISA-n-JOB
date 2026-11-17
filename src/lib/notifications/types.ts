/**
 * Notification provider interface (PRD R-214; PLAN P0c-6 → formalized in P2d).
 *
 * - Every sender (OTP, staff alerts, interview consent, R-213 jobs) builds a `NotificationMessage`
 *   and calls `getNotificationProvider().send(...)` (index.ts picks the adapter per channel).
 * - Messages carry a template key + params, not rendered copy: adapters that deliver text resolve
 *   it from messages/*.json (render.ts); the console adapter logs the key only.
 * - `send` never throws for a delivery problem: it answers `{ ok: false, provider, error }` with an
 *   error code (no address or message text), so callers can keep their own record (StaffTask) open.
 * - Adapters: console.ts (all channels, development / fallback), smtp.ts (EMAIL, only with SMTP_*).
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
