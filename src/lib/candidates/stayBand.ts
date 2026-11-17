/**
 * 체류 남은 기간 구간 (WO §7.5 `stayRemainingBand`, WO §9.3 필터 "잔여기간 구간").
 *
 * Employers never see the stay expiry month itself, only the band of months left. The band edges
 * are operator values (`STAY_REMAINING_BANDS`, src/config/limits.ts). Months left are counted from
 * the current month in Korea (the same "this month" as `isStayExpired`) to the stored expiry month
 * (1st of the month, 00:00 UTC — `monthToDate`). The query form (`stayBandWhere`) and the display
 * form (`stayRemainingBandOf`) use the same edges, so a filter never disagrees with the card.
 */
import type { Prisma } from "@prisma/client";

import { STAY_REMAINING_BANDS } from "@/config/limits";
import { notExpiredFrom } from "@/lib/visa-engine/classifyTrack";

export type StayBandCode = (typeof STAY_REMAINING_BANDS)[number]["code"];
/** `UNKNOWN`: no expiry stored (quick signup data; the wizard requires one before completion). */
export type StayRemainingBand = StayBandCode | "UNKNOWN";

export const STAY_BAND_CODES: readonly StayBandCode[] = STAY_REMAINING_BANDS.map((b) => b.code);

export function isStayBandCode(value: unknown): value is StayBandCode {
  return typeof value === "string" && (STAY_BAND_CODES as readonly string[]).includes(value);
}

function monthIndex(d: Date): number {
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
}

/** Stored-month value `months` after the current month in Korea at `now`. */
function monthFromCurrent(now: Date, months: number): Date {
  const cur = notExpiredFrom(now);
  return new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + months, 1));
}

/** Months from the current month (Korea) to the expiry month; 0 = expires this month. */
export function monthsLeft(stayExpiry: Date, now: Date = new Date()): number {
  return monthIndex(stayExpiry) - monthIndex(notExpiredFrom(now));
}

export function stayRemainingBandOf(
  stayExpiry: Date | null | undefined,
  now: Date = new Date(),
): StayRemainingBand {
  if (!stayExpiry) return "UNKNOWN";
  const m = Math.max(0, monthsLeft(stayExpiry, now));
  const band = STAY_REMAINING_BANDS.find(
    (b) => m >= b.minMonths && (b.maxMonths === null || m < b.maxMonths),
  );
  return band?.code ?? "UNKNOWN";
}

/** `stayExpiry` condition of one band (query layer, WO §9.3 filter). */
export function stayBandWhere(
  code: StayBandCode,
  now: Date = new Date(),
): Prisma.SeekerProfileWhereInput {
  const band = STAY_REMAINING_BANDS.find((b) => b.code === code);
  if (!band) return {};
  return {
    stayExpiry: {
      gte: monthFromCurrent(now, band.minMonths),
      ...(band.maxMonths === null ? {} : { lt: monthFromCurrent(now, band.maxMonths) }),
    },
  };
}
