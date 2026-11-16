/**
 * Fixed choice lists of the seeker registration wizard (WO §7.3). Client-safe (no database).
 *
 * These are form vocabularies, not legal values (BR-12): visa codes, regions and industries come
 * from the database (VisaType, Region, Industry). Labels come from messages
 * (`seeker.register.{step}.{field}.option.{VALUE}`); country and language names come from
 * `Intl.DisplayNames` in the viewer's locale.
 *
 * Stored values are UPPER_SNAKE codes (STANDARD 4.3). Free text is never offered where the value is
 * shown to employers in blind form (BR-14: seeker free text is not exposed) — e.g. experience role
 * and licenses are codes.
 */

/** "모름" for optional choice questions, visa sub type, shiftOk and the next visa goal (SC-02). */
export const UNKNOWN = "UNKNOWN";

/** WO §7.3 Step 5 desiredRegions "어디든 가능". */
export const ANY_REGION = "ANY";

export const MESSENGER_TYPES = [
  "KAKAO",
  "ZALO",
  "WHATSAPP",
  "TELEGRAM",
  "WECHAT",
  "VIBER",
  "NONE",
] as const;

/** WO §7.3 Step 1 gender: internal only (숙소 배정), "응답 안 함" included (STANDARD 3.3). */
export const GENDERS = ["MALE", "FEMALE", "OTHER", "NO_ANSWER"] as const;

/** ISO 3166-1 alpha-2 codes offered for nationality / experience country; OTHER = 그 밖의 나라. */
export const COUNTRY_CODES = [
  "VN",
  "UZ",
  "CN",
  "PH",
  "ID",
  "TH",
  "KH",
  "MN",
  "NP",
  "MM",
  "LK",
  "BD",
  "PK",
  "IN",
  "KZ",
  "KG",
  "TJ",
  "RU",
  "UA",
  "LA",
  "TL",
  "JP",
  "TW",
  "US",
  "CA",
  "AU",
  "GB",
  "FR",
  "DE",
  "BR",
  "PE",
  "NG",
  "GH",
  "EG",
  "TR",
  "KR",
  "OTHER",
] as const;

export const EDUCATION_LEVELS = [
  "MIDDLE_OR_LESS",
  "HIGH_SCHOOL",
  "COLLEGE",
  "BACHELOR",
  "MASTER",
  "DOCTOR",
] as const;

/** TOPIK: 0 = 없음, 1~6급. */
export const TOPIK_LEVELS = ["0", "1", "2", "3", "4", "5", "6"] as const;
/** 사회통합프로그램: 0 = 없음, 1~5단계. */
export const KIIP_STAGES = ["0", "1", "2", "3", "4", "5"] as const;
/** 한국어 회화 자가 평가 4단계 (예시 문장 제공). */
export const KOREAN_SPEAKING_LEVELS = ["1", "2", "3", "4"] as const;

/** ISO 639-1 codes for "기타 가능 언어"; OTHER = 그 밖의 언어. */
export const LANGUAGE_CODES = [
  "en",
  "zh",
  "vi",
  "ru",
  "uz",
  "ja",
  "th",
  "id",
  "mn",
  "ne",
  "km",
  "my",
  "tl",
  "kk",
  "ky",
  "ur",
  "bn",
  "hi",
  "ar",
  "es",
  "fr",
  "OTHER",
] as const;

/** WO §7.3 Step 4 skills. */
export const SKILLS = [
  "FORKLIFT",
  "WELDING",
  "CNC",
  "ELECTRICAL",
  "PAINTING",
  "ASSEMBLY",
  "PACKING",
  "CARE",
  "COOKING",
  "DRIVING",
  "COMPUTER",
  "OTHER",
] as const;

/** WO §7.3 Step 4 licenses ("기타" is a code; no free text — BR-14). */
export const LICENSES = [
  "KR_DRIVER_LICENSE",
  "FORKLIFT_LICENSE",
  "WELDING_CERT",
  "CARE_WORKER_CERT",
  "OTHER",
] as const;

/** Step 4 experience role (직무). Codes only: the role is part of the blind experience summary. */
export const JOB_ROLES = [
  "PRODUCTION",
  "ASSEMBLY",
  "WELDING",
  "MACHINE_OPERATION",
  "PACKING",
  "LOGISTICS",
  "CONSTRUCTION",
  "AGRICULTURE",
  "FISHERY",
  "CARE",
  "FOOD_SERVICE",
  "CLEANING",
  "OFFICE",
  "IT",
  "SALES",
  "INTERPRETATION",
  "OTHER",
] as const;

/** Prisma `JobSearchStatus`. */
export const JOB_SEARCH_STATUSES = [
  "IMMEDIATE",
  "WITHIN_1M",
  "EMPLOYED_OPEN",
  "NOT_SEARCHING",
] as const;

/** Prisma `ShiftOk` (SC-10). */
export const SHIFT_OK_VALUES = ["YES", "NO", "CONDITIONAL", "UNKNOWN"] as const;

/** Step 6 consultTime. */
export const CONSULT_TIMES = ["MORNING", "AFTERNOON", "EVENING", "WEEKEND"] as const;

/** Yes / no chips (hasArc, needDormitory: yes / no only — SC-02). */
export const YES_NO = ["YES", "NO"] as const;

/** Optional yes / no with 모름 — Prisma `YesNoUnknown` (STANDARD 3.3 B-5: pendingApplication, Q-10). */
export const YES_NO_UNKNOWN = ["YES", "NO", "UNKNOWN"] as const;

/** Consent types of Step 7 (WO §7.3). THIRD_PARTY_INTERVIEW is asked per interview (P2c). */
export const REGISTRATION_CONSENTS = [
  "PRIVACY_REQUIRED",
  "BLIND_PROFILE",
  "MARKETING",
  "NOTICE",
] as const;
export type RegistrationConsent = (typeof REGISTRATION_CONSENTS)[number];

/** Consents a seeker may revoke / give again on /seeker/me (R-113). Required ones need a consult. */
export const REVOCABLE_CONSENTS = ["BLIND_PROFILE", "MARKETING"] as const;
export type RevocableConsent = (typeof REVOCABLE_CONSENTS)[number];

/** Wizard steps (WO §7.3). Step 3 and 5 have two sub screens each (SC-01). */
export const WIZARD_LAST_STEP = 7;
export const SPLIT_STEPS = { 3: ["a", "b"], 5: ["a", "b"] } as const;

/** "YYYY-MM" → Date (UTC, first day of the month). */
export function monthToDate(value: string): Date | null {
  const m = /^([0-9]{4})-([0-9]{2})$/.exec(value);
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return new Date(Date.UTC(Number(m[1]), month - 1, 1));
}

/** Date → "YYYY-MM" (UTC). */
export function dateToMonth(date: Date | null | undefined): string {
  if (!date) return "";
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" → Date (UTC midnight). */
export function dayToDate(value: string): Date | null {
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) || dateToDay(d) !== value ? null : d;
}

/** Date → "YYYY-MM-DD" (UTC). */
export function dateToDay(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}
