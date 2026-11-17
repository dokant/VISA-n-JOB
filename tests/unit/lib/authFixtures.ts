/** Shared helpers for the P1b auth tests (unique phones / e-mails per test; the DB is never cleaned). */
import { randomInt } from "node:crypto";

import type { NotificationMessage, NotificationProvider } from "@/lib/notifications";
import { bizRegNoCheckDigit } from "@/schemas/auth/auth";

export function randomPhone(): string {
  return `+8210${randomInt(10_000_000, 99_999_999)}`;
}

export function randomEmail(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomInt(1e9)}@example.test`;
}

/** Random 사업자등록번호 with a valid check digit (P1b QA O-4). */
export function randomBizRegNo(): string {
  const firstNine = String(randomInt(100_000_000, 999_999_999));
  return `${firstNine}${bizRegNoCheckDigit(firstNine)}`;
}

/** Captures what would be sent instead of printing it. */
export function captureNotifier(): NotificationProvider & { sent: NotificationMessage[] } {
  const sent: NotificationMessage[] = [];
  return {
    name: "capture",
    sent,
    async send(message) {
      sent.push(message);
      return { ok: true, provider: "capture", id: String(sent.length), delivery: "SIMULATED" };
    },
  };
}

export const at = (iso: string) => new Date(iso);
export const plusSec = (d: Date, sec: number) => new Date(d.getTime() + sec * 1000);
