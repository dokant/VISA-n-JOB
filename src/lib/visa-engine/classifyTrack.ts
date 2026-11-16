/**
 * Seeker track classification (R-108, WO §7.4) and the registration block (R-109, BR-08).
 *
 * The visa → track table lives in the `VisaType` rows (defaultTrack, registrable, autoConsult,
 * needsVisaReview, graduationWindow*), seeded from WO §7.4 and editable by admins. This module has
 * NO visa code, no mapping constant and no legal number: it only reads the row it is given.
 *
 * Order of checks:
 *   1. no row (visa missing / unknown code)        → not registrable (NO_VISA)
 *   2. row.registrable = false (B-1, C-3, 모름, 기타…) → not registrable (VISA_NOT_REGISTRABLE)
 *      Registrability is decided ONLY by `registrable` (STANDARD 4.9, never by defaultTrack = null).
 *   3. stay expiry month before the current month   → not registrable (STAY_EXPIRED)
 *   4. graduation window (D-2 "졸업 예정 N개월 이내") → graduationWindowTrack (+ its auto consult)
 *   5. otherwise defaultTrack (+ autoConsult); a registrable row without a track waits for staff
 *      review as CONSULT_ONLY.
 * `needsVisaReview` (E-7 계열) is copied from the row in every registrable case.
 */
import type { SeekerTrack, VisaType } from "@prisma/client";

import { db } from "@/lib/db";

export type VisaTypeTrackData = Pick<
  VisaType,
  | "code"
  | "registrable"
  | "defaultTrack"
  | "autoConsult"
  | "needsVisaReview"
  | "graduationWindowMonths"
  | "graduationWindowTrack"
  | "graduationWindowAutoConsult"
  | "requiresGraduationDate"
>;

export type TrackBlockReason = "NO_VISA" | "VISA_NOT_REGISTRABLE" | "STAY_EXPIRED";

export type TrackResult =
  | {
      registrable: true;
      track: SeekerTrack;
      /** create a CONSULT StaffTask on registration (WO §7.4 D-10, D-2 window) */
      autoConsult: boolean;
      /** SeekerProfile.needsVisaReview (WO §7.4 E-7 계열) */
      needsVisaReview: boolean;
    }
  | { registrable: false; reason: TrackBlockReason };

export type ClassifyInput = {
  visaType: VisaTypeTrackData | null;
  /** Month of stay expiry (any day inside the month). Unknown (quick signup) = not checked. */
  stayExpiry?: Date | null;
  /** Month of (expected) graduation. */
  graduationDate?: Date | null;
  now?: Date;
};

/**
 * Stored months (stayExpiry, graduationDate) are calendar labels saved as the 1st of the month at
 * 00:00 UTC (`monthToDate`), so their month is read in UTC.
 */
function monthStart(d: Date, addMonths = 0): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + addMonths, 1);
}

/** Service time zone: "this month" is the month in Korea (O-8), not the UTC month. */
const SERVICE_TIME_ZONE = "Asia/Seoul";
const serviceMonthFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: SERVICE_TIME_ZONE,
  year: "numeric",
  month: "numeric",
});

/** The current month in Asia/Seoul at `now`, as a stored-month value (1st 00:00 UTC), shifted. */
function currentMonthStart(now: Date, addMonths = 0): number {
  const parts = serviceMonthFormat.formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  return Date.UTC(year, month - 1 + addMonths, 1);
}

/**
 * True when the expiry month is already over in Korea (a permit valid "until this month" is not
 * expired; it expires at 00:00 KST on the 1st of the next month).
 */
export function isStayExpired(stayExpiry: Date, now: Date = new Date()): boolean {
  return monthStart(stayExpiry) < currentMonthStart(now);
}

/**
 * Earliest stored expiry (month) that is not expired at `now` — the query form of `isStayExpired`:
 * `stayExpiry >= notExpiredFrom(now)` ⇔ `!isStayExpired(stayExpiry, now)`.
 */
export function notExpiredFrom(now: Date = new Date()): Date {
  return new Date(currentMonthStart(now));
}

function withinGraduationWindow(
  row: VisaTypeTrackData,
  graduationDate: Date | null | undefined,
  now: Date,
): boolean {
  if (row.graduationWindowMonths == null || row.graduationWindowTrack == null) return false;
  if (!graduationDate) return false;
  const grad = monthStart(graduationDate);
  return (
    grad >= currentMonthStart(now) && grad <= currentMonthStart(now, row.graduationWindowMonths)
  );
}

export function classifyTrack(input: ClassifyInput): TrackResult {
  const now = input.now ?? new Date();
  const row = input.visaType;
  if (!row) return { registrable: false, reason: "NO_VISA" };
  if (!row.registrable) return { registrable: false, reason: "VISA_NOT_REGISTRABLE" };
  if (input.stayExpiry && isStayExpired(input.stayExpiry, now)) {
    return { registrable: false, reason: "STAY_EXPIRED" };
  }
  if (withinGraduationWindow(row, input.graduationDate, now)) {
    return {
      registrable: true,
      track: row.graduationWindowTrack as SeekerTrack,
      autoConsult: row.graduationWindowAutoConsult,
      needsVisaReview: row.needsVisaReview,
    };
  }
  return {
    registrable: true,
    track: row.defaultTrack ?? "CONSULT_ONLY",
    autoConsult: row.autoConsult,
    needsVisaReview: row.needsVisaReview,
  };
}

const TRACK_SELECT = {
  code: true,
  registrable: true,
  defaultTrack: true,
  autoConsult: true,
  needsVisaReview: true,
  graduationWindowMonths: true,
  graduationWindowTrack: true,
  graduationWindowAutoConsult: true,
  requiresGraduationDate: true,
} as const;

/** The active VisaType row for a code, or null (unknown / inactive code). */
export async function loadVisaTypeForTrack(
  code: string | null | undefined,
): Promise<VisaTypeTrackData | null> {
  if (!code) return null;
  return db.visaType.findFirst({ where: { code, active: true }, select: TRACK_SELECT });
}

/** Every active VisaType row with the track columns, in operator order. */
export async function listVisaTypesForTrack(): Promise<VisaTypeTrackData[]> {
  return db.visaType.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: TRACK_SELECT,
  });
}

/** classifyTrack with the row read from the database. */
export async function classifyVisa(
  input: Omit<ClassifyInput, "visaType"> & { visaCode: string | null | undefined },
): Promise<TrackResult> {
  const { visaCode, ...rest } = input;
  return classifyTrack({ ...rest, visaType: await loadVisaTypeForTrack(visaCode) });
}
