import { z } from "zod";

import { detectContacts } from "@/lib/pii-guard";
import { phoneField } from "@/schemas/auth/auth";

/**
 * 구인 의뢰서 (R-125, WO §9.2) — shared by the client form and the server action (STANDARD 4.6).
 *
 * - 회사 정보: company name (Company.nameEnc), work place 시·도/시·군·구, 상시근로자 수, and the
 *   contact person for the staff verification call (JobLead.contact*Enc, staff only — BR-01: never
 *   shown to seekers).
 * - 일자리 조건: 직무, 급여, 근무시간, 잔업, 채용 인원, 시기 / 생활 조건: 숙소, 식사, 희망 조건.
 * - Free-text fields go through pii-guard (BR-14): a phone number, e-mail, URL or messenger id is
 *   refused with the error code `contactInfo` (the form shows why). The server re-checks with the
 *   same schema, so nothing with a contact pattern is ever stored.
 * - Lengths and amounts are input-format / storage bounds (STANDARD S-53), not legal values.
 */
export const OVERTIME_OPTIONS = ["NONE", "SOMETIMES", "REGULAR", "UNKNOWN"] as const;
export const START_TIMING_OPTIONS = ["IMMEDIATE", "WITHIN_1M", "WITHIN_3M", "UNDECIDED"] as const;
export const DORMITORY_OPTIONS = ["PROVIDED", "ALLOWANCE", "NONE"] as const;
export const MEALS_OPTIONS = ["PROVIDED", "PARTIAL", "NONE"] as const;

/** Free text that must not carry a contact (BR-14). */
function guardedText(max: number) {
  return z
    .string()
    .trim()
    .max(max, "tooLong")
    .refine((v) => detectContacts(v).length === 0, "contactInfo");
}
const requiredText = (max: number) => guardedText(max).refine((v) => v.length > 0, "required");

const code = z.string().trim().min(1, "required").max(40, "invalidValue");
/** "" → missing ("required"); "12" → 12; anything else is left for z.number() to refuse. */
const toNumber = (v: unknown) => {
  if (v === "" || v === null || v === undefined) return undefined;
  if (typeof v !== "string") return v;
  const t = v.trim().replace(/,/g, "");
  if (t === "") return undefined;
  return /^-?[0-9]+(.[0-9]+)?$/.test(t) ? Number(t) : t;
};
const numberIn = (min: number, max: number) =>
  z
    .number({ required_error: "required", invalid_type_error: "invalidNumber" })
    .int("invalidNumber")
    .min(min, "invalidNumber")
    .max(max, "invalidNumber");
const wholeNumber = (min: number, max: number) => z.preprocess(toNumber, numberIn(min, max));
const optionalWholeNumber = (min: number, max: number) =>
  z.preprocess(toNumber, numberIn(min, max).optional());

export const jobRequestSchema = z
  .object({
    // ── 회사 정보 ──
    companyName: requiredText(100),
    sido: code,
    sigungu: code,
    employeeCount: wholeNumber(1, 1_000_000),
    contactName: z.string().trim().min(1, "required").max(50, "tooLong"),
    contactPhone: phoneField,
    contactEmail: z
      .string()
      .trim()
      .max(254, "tooLong")
      .refine((v) => v === "" || z.string().email().safeParse(v).success, "invalidEmail"),
    // ── 일자리 조건 ──
    role: requiredText(100),
    payMin: wholeNumber(1, 100_000_000),
    payMax: optionalWholeNumber(1, 100_000_000),
    workHours: requiredText(200),
    overtime: z.enum(OVERTIME_OPTIONS, { message: "required" }),
    headcount: wholeNumber(1, 10_000),
    startTiming: z.enum(START_TIMING_OPTIONS, { message: "required" }),
    // ── 생활 조건·희망 조건 ──
    dormitory: z.enum(DORMITORY_OPTIONS, { message: "required" }),
    meals: z.enum(MEALS_OPTIONS, { message: "required" }),
    preferences: guardedText(1000),
    detail: guardedText(2000),
  })
  .superRefine((v, ctx) => {
    if (v.payMax !== undefined && v.payMax < v.payMin) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "payRange", path: ["payMax"] });
    }
  });

export type JobRequestInput = z.input<typeof jobRequestSchema>;
export type JobRequestValues = z.output<typeof jobRequestSchema>;

/** Free-text fields checked by pii-guard (BR-14). */
export const JOB_REQUEST_GUARDED_FIELDS = [
  "companyName",
  "role",
  "workHours",
  "preferences",
  "detail",
] as const satisfies ReadonlyArray<keyof JobRequestValues>;

/** Fields of each form screen (≤7 questions per screen, STANDARD 3.3). */
export const JOB_REQUEST_STEPS = {
  company: [
    "companyName",
    "sido",
    "sigungu",
    "employeeCount",
    "contactName",
    "contactPhone",
    "contactEmail",
  ],
  job: ["role", "payMin", "payMax", "workHours", "overtime", "headcount", "startTiming"],
  living: ["dormitory", "meals", "preferences", "detail"],
} as const satisfies Record<string, ReadonlyArray<keyof JobRequestValues>>;
