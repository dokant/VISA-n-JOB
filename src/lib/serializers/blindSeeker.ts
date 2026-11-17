/**
 * Blind seeker serializer (BR-02, WO §7.5, PRD R-204, STANDARD 4.4).
 *
 * Every piece of seeker data that leaves the server for an employer (the candidate list page,
 * `/api/employer/**`, employer server actions) goes through `serializeBlindSeeker`. The result is a
 * NEW object built key by key from `BLIND_SEEKER_FIELDS` (WO §7.5 verbatim) — no spread, no
 * blacklist:
 * - `BLIND_SEEKER_SELECT` reads only the columns the whitelist needs. Names, photos, contacts
 *   (`*Enc`), birth year, gender, school name, free text (`major`, `employerNameEnc`), referral
 *   codes and internal ids are never selected (WO §7.5, BR-14 구직자 자유 입력 비노출).
 * - `BlindSeeker` is a mapped type over `BLIND_SEEKER_FIELDS`; the object literal below is checked
 *   against it, so a key outside the list (or a missing key) is a type error.
 * - At run time the result is frozen (also its arrays and experience rows) and its key set is
 *   compared with the list once more (`assertBlindKeys`), so no caller can add a key afterwards.
 * - Code values are passed through only when they look like codes (or belong to the option list);
 *   anything else becomes null / is dropped, so a stray free-text value cannot reach an employer.
 *
 * Calculated values (WO §7.5 "계산값"):
 * - `publicId`: the profile's random public id (uuid column), never the database id.
 *   It is written with 16 consonant letters instead of hex digits and dashes (`toBlindPublicId`):
 *   about 5% of raw uuids look like phone numbers to pii-guard ("840-8483-4067"), which would break
 *   the R-206 contact scan of employer responses and the audit meta check. Letters never match.
 * - `stayRemainingBand`: band of months left until the stay expiry month (src/lib/candidates/stayBand.ts,
 *   edges in limits.ts) — the expiry month itself is not exposed.
 * - `yearsInKorea`: current year in Korea minus `entryYear` (first entry year), at least 0; null
 *   when the entry year is unknown.
 * - `experienceSummary`: `[{ industry, role, months }]` from the experience rows (KSIC code, role
 *   code, months), longest first. Company name and country are not included.
 * - `groupApplySize`: number of seekers applying together (computed by the query layer from the
 *   friend codes, `groupApplySizes`); null when the seeker does not apply with friends.
 * - `majorField`: the coded 전공 분야 from wizard Step 3a (`MAJOR_FIELDS`, DECISIONS Q-24), only
 *   when the stored value is in that list. The free-text `major` is never selected (BR-14).
 */
import type { Prisma } from "@prisma/client";

import {
  EDUCATION_LEVELS,
  JOB_ROLES,
  JOB_SEARCH_STATUSES,
  LANGUAGE_CODES,
  LICENSES,
  MAJOR_FIELDS,
  SHIFT_OK_VALUES,
  SKILLS,
} from "@/lib/seeker/options";
import { type StayRemainingBand, stayRemainingBandOf } from "@/lib/candidates/stayBand";

export const BLIND_SEEKER_FIELDS = [
  "publicId", // 랜덤 공개 ID (DB id 아님)
  "nationality",
  "sido",
  "visaCode",
  "visaSubType",
  "stayRemainingBand", // 계산값
  "yearsInKorea", // 계산값
  "educationLevel",
  "majorField",
  "graduationDate",
  "topikLevel",
  "kiipStage",
  "koreanSpeaking",
  "otherLanguages",
  "experienceSummary", // [{industry, role, months}] 회사명 제외
  "skills",
  "licenses",
  "jobSearchStatus",
  "availableFrom",
  "desiredIndustries",
  "desiredRegions",
  "needDormitory",
  "shiftOk",
  "desiredPayMin",
  "groupApplySize",
  "grade",
  "verifiedVisa",
  "verifiedKorean",
  "convertibleVisa",
  "convertibleAt", // 행정사 판정
] as const;

export type BlindSeekerField = (typeof BLIND_SEEKER_FIELDS)[number];

/** Columns read for a blind profile. Nothing else is selected (no *Enc, no free text, no ids). */
export const BLIND_SEEKER_SELECT = {
  publicId: true,
  nationality: true,
  sido: true,
  visaCode: true,
  visaSubType: true,
  stayExpiry: true,
  entryYear: true,
  educationLevel: true,
  majorField: true,
  graduationDate: true,
  topikLevel: true,
  kiipStage: true,
  koreanSpeaking: true,
  otherLanguages: true,
  skills: true,
  licenses: true,
  jobSearchStatus: true,
  availableFrom: true,
  desiredIndustries: true,
  desiredRegions: true,
  needDormitory: true,
  shiftOk: true,
  desiredPayMin: true,
  grade: true,
  verifiedVisa: true,
  verifiedKorean: true,
  convertibleVisa: true,
  convertibleAt: true,
  experiences: { select: { industryCode: true, role: true, months: true } },
} as const satisfies Prisma.SeekerProfileSelect;

export type BlindSeekerRow = Prisma.SeekerProfileGetPayload<{
  select: typeof BLIND_SEEKER_SELECT;
}>;

export type ExperienceSummaryItem = {
  readonly industry: string;
  readonly role: string;
  readonly months: number;
};

type FieldTypes = {
  publicId: string;
  nationality: string | null;
  sido: string | null;
  visaCode: string | null;
  visaSubType: string | null;
  stayRemainingBand: StayRemainingBand;
  yearsInKorea: number | null;
  educationLevel: string | null;
  /** MAJOR_FIELDS code */
  majorField: string | null;
  /** "YYYY-MM" */
  graduationDate: string | null;
  topikLevel: number | null;
  kiipStage: number | null;
  koreanSpeaking: number | null;
  otherLanguages: readonly string[];
  experienceSummary: readonly ExperienceSummaryItem[];
  skills: readonly string[];
  licenses: readonly string[];
  jobSearchStatus: string | null;
  /** "YYYY-MM-DD" */
  availableFrom: string | null;
  desiredIndustries: readonly string[];
  desiredRegions: readonly string[];
  needDormitory: boolean | null;
  shiftOk: string | null;
  desiredPayMin: number | null;
  groupApplySize: number | null;
  grade: "S" | "A" | "B";
  verifiedVisa: boolean;
  verifiedKorean: boolean;
  convertibleVisa: string | null;
  /** "YYYY-MM" */
  convertibleAt: string | null;
};

/** Exactly the WO §7.5 keys (a mapped type: no other key can be added to a value of this type). */
export type BlindSeeker = { readonly [K in BlindSeekerField]: FieldTypes[K] };

export type BlindSeekerContext = {
  now?: Date;
  /** From `groupApplySizes` (query layer); null / missing = not applying with friends. */
  groupApplySize?: number | null;
};

/** A reference code (VisaType / Region / Industry / ISO code). Anything else is not passed on. */
const CODE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;

/** 16 letters standing for the hex digits 0-f of the uuid (no vowels: no words, no keywords). */
const BLIND_ID_ALPHABET = "bcdfghjkmnpqrstv";
const BLIND_ID = /^[bcdfghjkmnpqrstv]{32}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** `SeekerProfile.publicId` (uuid) → the id employers see. */
export function toBlindPublicId(uuid: string): string {
  const hex = uuid.toLowerCase();
  if (!UUID.test(hex)) throw new Error("blindSeeker: publicId is not a uuid");
  return hex.replace(/-/g, "").replace(/[0-9a-f]/g, (c) => BLIND_ID_ALPHABET[parseInt(c, 16)]);
}

/** The id employers send back (면접 요청) → `SeekerProfile.publicId`, or null when malformed. */
export function fromBlindPublicId(id: string): string | null {
  if (!BLIND_ID.test(id)) return null;
  const hex = [...id].map((c) => BLIND_ID_ALPHABET.indexOf(c).toString(16)).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

export function isBlindPublicId(value: unknown): value is string {
  return typeof value === "string" && BLIND_ID.test(value);
}

function code(value: string | null | undefined): string | null {
  return typeof value === "string" && CODE.test(value) ? value : null;
}

function oneOf(list: readonly string[], value: string | null | undefined): string | null {
  return typeof value === "string" && list.includes(value) ? value : null;
}

function codes(values: readonly unknown[] | null | undefined, list?: readonly string[]): string[] {
  if (!Array.isArray(values)) return [];
  return values.filter(
    (v): v is string => typeof v === "string" && (list ? list.includes(v) : CODE.test(v)),
  );
}

function intOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function month(d: Date | null | undefined): string | null {
  return d ? d.toISOString().slice(0, 7) : null;
}

function day(d: Date | null | undefined): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

const KST_YEAR = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", year: "numeric" });

/** Calendar years in Korea since the first entry year (WO §7.5 `yearsInKorea`). */
export function yearsInKoreaOf(entryYear: number | null | undefined, now: Date): number | null {
  if (typeof entryYear !== "number" || !Number.isInteger(entryYear)) return null;
  return Math.max(0, Number(KST_YEAR.format(now)) - entryYear);
}

/** `[{ industry, role, months }]`, longest first; rows with a non-code industry are dropped. */
export function experienceSummaryOf(
  rows: readonly { industryCode: string; role: string; months: number }[] | null | undefined,
): ExperienceSummaryItem[] {
  return (rows ?? [])
    .filter((r) => code(r.industryCode) !== null && Number.isInteger(r.months) && r.months > 0)
    .map((r) =>
      Object.freeze({
        industry: r.industryCode,
        role: oneOf(JOB_ROLES, r.role) ?? "OTHER",
        months: r.months,
      }),
    )
    .sort((a, b) => b.months - a.months);
}

function frozen<T>(list: T[]): readonly T[] {
  return Object.freeze(list);
}

/** Runtime guard (WO §15-1): the key set of a serialized value equals BLIND_SEEKER_FIELDS. */
export function assertBlindKeys(value: object): void {
  const keys = Object.keys(value);
  const allowed = BLIND_SEEKER_FIELDS as readonly string[];
  const extra = keys.filter((k) => !allowed.includes(k));
  if (extra.length > 0 || keys.length !== allowed.length) {
    throw new Error(`blindSeeker: key set differs from BLIND_SEEKER_FIELDS (${extra.join(",")})`);
  }
}

function gradeOf(value: string): "S" | "A" | "B" {
  return value === "S" || value === "A" ? value : "B";
}

/** Builds the blind object from a row read with `BLIND_SEEKER_SELECT`. */
export function serializeBlindSeeker(
  row: BlindSeekerRow,
  ctx: BlindSeekerContext = {},
): BlindSeeker {
  const now = ctx.now ?? new Date();
  const group = ctx.groupApplySize;
  const out: BlindSeeker = {
    publicId: toBlindPublicId(row.publicId),
    nationality: code(row.nationality),
    sido: code(row.sido),
    visaCode: code(row.visaCode),
    visaSubType: code(row.visaSubType),
    stayRemainingBand: stayRemainingBandOf(row.stayExpiry, now),
    yearsInKorea: yearsInKoreaOf(row.entryYear, now),
    educationLevel: oneOf(EDUCATION_LEVELS, row.educationLevel),
    majorField: oneOf(MAJOR_FIELDS, row.majorField),
    graduationDate: month(row.graduationDate),
    topikLevel: intOrNull(row.topikLevel),
    kiipStage: intOrNull(row.kiipStage),
    koreanSpeaking: intOrNull(row.koreanSpeaking),
    otherLanguages: frozen(
      codes(Array.isArray(row.otherLanguages) ? row.otherLanguages : [], LANGUAGE_CODES),
    ),
    experienceSummary: frozen(experienceSummaryOf(row.experiences)),
    skills: frozen(codes(row.skills, SKILLS)),
    licenses: frozen(codes(row.licenses, LICENSES)),
    jobSearchStatus: oneOf(JOB_SEARCH_STATUSES, row.jobSearchStatus),
    availableFrom: day(row.availableFrom),
    desiredIndustries: frozen(codes(row.desiredIndustries)),
    desiredRegions: frozen(codes(row.desiredRegions)),
    needDormitory: typeof row.needDormitory === "boolean" ? row.needDormitory : null,
    shiftOk: oneOf(SHIFT_OK_VALUES, row.shiftOk),
    desiredPayMin: intOrNull(row.desiredPayMin),
    groupApplySize: typeof group === "number" && group > 1 ? group : null,
    grade: gradeOf(row.grade),
    verifiedVisa: row.verifiedVisa === true,
    verifiedKorean: row.verifiedKorean === true,
    convertibleVisa: code(row.convertibleVisa),
    convertibleAt: month(row.convertibleAt),
  };
  assertBlindKeys(out);
  return Object.freeze(out);
}
