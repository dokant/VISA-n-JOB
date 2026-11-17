/**
 * Date and time display — the one place that decides date / time formatting options
 * (STANDARD 3.5 v2.19, DECISIONS Q-26). Every screen (public, seeker, employer, admin) formats dates
 * through these functions instead of passing `Intl.DateTimeFormat` options inline.
 *
 * - Display time zone: Korea (`Asia/Seoul`) unless a caller passes another one (stored months and
 *   calendar days kept at 00:00 UTC use `timeZone: "UTC"`).
 * - ko shows the time on the 24-hour clock ("2026. 11. 22. 18:58"). The ko time is built from the
 *   numeric hour / minute parts (`hourCycle: "h23"`), never from the runtime ICU/CLDR time pattern, so
 *   neither "PM 6:58" nor "오후 6:58" can appear whatever ICU data the server or browser ships.
 * - Other locales keep their own default clock until a decision says otherwise (Q-26).
 *
 * Pure module (no server imports): client components may use it too.
 */
export const DISPLAY_TIME_ZONE = "Asia/Seoul";

/** Locales with an explicit 24-hour clock (Q-26). */
const H23_LOCALES: ReadonlySet<string> = new Set(["ko"]);

export function uses24HourClock(locale: string): boolean {
  return H23_LOCALES.has(locale.split("-")[0]);
}

export type DateStyle = "short" | "medium" | "long";

type DateOptions = {
  /** Date part: a `dateStyle`, or explicit fields (e.g. admin "2026. 01. 05."). Default "medium". */
  dateStyle?: DateStyle;
  date?: Intl.DateTimeFormatOptions;
  timeZone?: string;
};

function dateOptions(opts: DateOptions): Intl.DateTimeFormatOptions {
  return {
    ...(opts.date ?? { dateStyle: opts.dateStyle ?? "medium" }),
    timeZone: opts.timeZone ?? DISPLAY_TIME_ZONE,
  };
}

/** Calendar date only (no time). */
export function formatDate(locale: string, value: Date, opts: DateOptions = {}): string {
  return new Intl.DateTimeFormat(locale, dateOptions(opts)).format(value);
}

/** "HH:mm" from the numeric parts of a 23-hour clock (no day period, no locale time pattern). */
function h23Time(value: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(value);
  const pick = (type: "hour" | "minute") =>
    (parts.find((p) => p.type === type)?.value ?? "0").padStart(2, "0");
  return `${pick("hour")}:${pick("minute")}`;
}

/** Time of day only. ko: "18:58". */
export function formatTime(locale: string, value: Date, opts: { timeZone?: string } = {}): string {
  const timeZone = opts.timeZone ?? DISPLAY_TIME_ZONE;
  if (uses24HourClock(locale)) return h23Time(value, timeZone);
  return new Intl.DateTimeFormat(locale, { timeStyle: "short", timeZone }).format(value);
}

/** Date and time. ko: "2026. 11. 22. 18:58". */
export function formatDateTime(locale: string, value: Date, opts: DateOptions = {}): string {
  const timeZone = opts.timeZone ?? DISPLAY_TIME_ZONE;
  if (uses24HourClock(locale)) {
    return `${formatDate(locale, value, opts)} ${h23Time(value, timeZone)}`;
  }
  if (opts.date) {
    return `${formatDate(locale, value, opts)} ${formatTime(locale, value, { timeZone })}`;
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: opts.dateStyle ?? "medium",
    timeStyle: "short",
    timeZone,
  }).format(value);
}

/** Year + month (stored months are the 1st 00:00 UTC). `month` "long" (default) or "2-digit". */
export function formatMonth(
  locale: string,
  value: Date,
  opts: { month?: "long" | "2-digit"; timeZone?: string } = {},
): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: opts.month ?? "long",
    timeZone: opts.timeZone ?? "UTC",
  }).format(value);
}

/** Month name only (month pickers). `monthIndex` 0–11. */
export function formatMonthName(locale: string, monthIndex: number): string {
  return new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(2000, monthIndex, 1)),
  );
}
