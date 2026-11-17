/**
 * 체류 만료 알림 D-90 / D-60 / D-30 + 행정사 업무 (PRD R-213, WO §7.7, DECISIONS PC-4 StaffTask, C-4).
 * Pure job handler `(now) => Promise<Result>` (clock injected; tests move time).
 *
 * - Days are Korean calendar days: "today" is the date in Asia/Seoul at `now`.
 * - `stayExpiry` is stored as a month (the 1st, 00:00 UTC — the seeker gives year + month only), so
 *   the day of expiry is unknown; reminders count from the 1st of that month, the earliest possible
 *   expiry day (a reminder is never late).
 * - A seeker is in the D-n window when `daysLeft` is n or less and more than the next smaller step
 *   (STAY_ALERT_DAYS 90 / 60 / 30): D-90 covers 90…61, D-60 60…31, D-30 30…1. Each step is handled once
 *   per expiry value: the StaffTask `dedupeKey` `STAY_EXPIRY:{seekerId}:{expiry day}:D-{n}` is unique,
 *   so a second run (or a missed day caught up later) never repeats it, and a new expiry (연장)
 *   starts a new series.
 * - Each step creates one StaffTask STAY_EXPIRY for STAFF_VISA (담당 행정사), due on the expiry day.
 *   The seeker gets the notice (SMS + e-mail, notifySeeker) only with `stayAlertOptIn` (/me/stay);
 *   the task payload records whether it was delivered and how (`delivery`: REAL when a real channel
 *   accepted it, SIMULATED when only the console adapter did — nobody received it, DECISIONS Q-27 —
 *   FAILED when none did). The task is created the same way in every case. Payload: codes and
 *   numbers only (no PII).
 * - BLOCKED seekers are skipped; expired stays (daysLeft ≤ 0) get nothing.
 */
import type { Prisma } from "@prisma/client";

import { SEEKER_JOB_BATCH, STAY_ALERT_DAYS } from "@/config/limits";
import { getSiteConfig } from "@/config/site.config";
import { db } from "@/lib/db";
import { getNotificationProvider, type NotificationProvider } from "@/lib/notifications";

import { notifySeeker, seekerLocale } from "./notifySeeker";
import type { JobOptions } from "./statusCheck";

type Client = typeof db;

const DAY_MS = 86_400_000;
const KST_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" });

/** messages `common.stayExpiry.{sms,email}` */
export const STAY_EXPIRY_TOPIC = "common.stayExpiry";

/** Steps from the largest (first notice) to the smallest. */
const STEPS = [...STAY_ALERT_DAYS].sort((a, b) => b - a);
const FIRST_STEP = STEPS[0];

export type StayExpiryResult = {
  tasks: number;
  /** Notices accepted by a channel (real or console). */
  notified: number;
  /** Of `notified`, console only (SIMULATED, Q-27). */
  notifiedSimulated: number;
  notifyFailed: number;
};

/** 00:00 UTC of the Korean calendar day that contains `now` (a pure calendar date). */
export function kstToday(now: Date): Date {
  return new Date(`${KST_DAY.format(now)}T00:00:00Z`);
}

/** Calendar days from the Korean today to the stored expiry day (UTC date of `stayExpiry`). */
export function daysUntil(stayExpiry: Date, now: Date): number {
  const expiryDay = Date.UTC(
    stayExpiry.getUTCFullYear(),
    stayExpiry.getUTCMonth(),
    stayExpiry.getUTCDate(),
  );
  return Math.round((expiryDay - kstToday(now).getTime()) / DAY_MS);
}

/** The D-n step whose window holds `daysLeft`, or null (more than D-90, or expired). */
export function stayAlertStep(daysLeft: number): number | null {
  if (daysLeft <= 0 || daysLeft > FIRST_STEP) return null;
  let step: number | null = null;
  for (const n of STEPS) if (daysLeft <= n) step = n;
  return step;
}

export function stayExpiryDedupeKey(seekerId: string, stayExpiry: Date, step: number): string {
  return `STAY_EXPIRY:${seekerId}:${stayExpiry.toISOString().slice(0, 10)}:D-${step}`;
}

function windowWhere(now: Date): Prisma.SeekerProfileWhereInput {
  const today = kstToday(now).getTime();
  return {
    status: { not: "BLOCKED" },
    stayExpiry: { gt: new Date(today), lte: new Date(today + FIRST_STEP * DAY_MS) },
  };
}

export async function runStayExpiryAlerts(
  now: Date,
  options: JobOptions = {},
): Promise<StayExpiryResult> {
  const client: Client = options.client ?? db;
  const scope = options.scope ?? {};
  const provider: NotificationProvider = options.provider ?? getNotificationProvider();
  const siteUrl = options.siteUrl ?? getSiteConfig().siteUrl;
  const result: StayExpiryResult = { tasks: 0, notified: 0, notifiedSimulated: 0, notifyFailed: 0 };
  const seen = new Set<string>();
  for (;;) {
    const batch = await client.seekerProfile.findMany({
      where: { AND: [windowWhere(now), scope, { id: { notIn: [...seen] } }] },
      select: {
        id: true,
        stayExpiry: true,
        stayAlertOptIn: true,
        emailEnc: true,
        user: { select: { phoneEnc: true, locale: true } },
      },
      orderBy: [{ stayExpiry: "asc" }, { id: "asc" }],
      take: SEEKER_JOB_BATCH,
    });
    if (batch.length === 0) return result;
    for (const row of batch) {
      seen.add(row.id);
      if (!row.stayExpiry) continue;
      const daysLeft = daysUntil(row.stayExpiry, now);
      const step = stayAlertStep(daysLeft);
      if (step === null) continue;
      const created = await client.staffTask.createManyAndReturn({
        data: [
          {
            type: "STAY_EXPIRY",
            assigneeRole: "STAFF_VISA",
            seekerId: row.id,
            dueAt: row.stayExpiry,
            dedupeKey: stayExpiryDedupeKey(row.id, row.stayExpiry, step),
            payload: { step, daysLeft, optIn: row.stayAlertOptIn, notified: false },
          },
        ],
        skipDuplicates: true,
        select: { id: true },
      });
      if (created.length === 0) continue; // this step was handled already
      result.tasks += 1;
      if (!row.stayAlertOptIn) continue;
      const locale = seekerLocale(row.user.locale);
      const { delivered, deliveredReal } = await notifySeeker(
        provider,
        { phone: row.user.phoneEnc, email: row.emailEnc, locale },
        STAY_EXPIRY_TOPIC,
        { days: daysLeft, url: `${siteUrl}/${locale}/seeker/me/stay` },
      );
      const delivery = deliveredReal > 0 ? "REAL" : delivered > 0 ? "SIMULATED" : "FAILED";
      await client.staffTask.update({
        where: { id: created[0].id },
        data: { payload: { step, daysLeft, optIn: true, notified: delivered > 0, delivery } },
      });
      if (delivered > 0) {
        result.notified += 1;
        if (delivery === "SIMULATED") result.notifiedSimulated += 1;
      } else {
        result.notifyFailed += 1;
      }
    }
  }
}
