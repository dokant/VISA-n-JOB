import { z } from "zod";

import {
  POSTING_HEADCOUNT_MAX,
  POSTING_PAY_MAX_KRW,
  POSTING_ROLE_MAX,
  POSTING_TITLE_MAX,
} from "@/config/limits";

/**
 * 블라인드 공고 (R-201, WO §8.5). Coded values are stored as codes and translated on the public
 * screen (6 languages); only the blind title and 직무 are free text, written by staff and checked by
 * pii-guard + the company-name check in src/lib/postings/manage.ts.
 */
export const POSTING_DORMITORY = ["NONE", "FREE", "PAID"] as const; // WO §5 JobPosting.dormitory
export const POSTING_MEALS = ["PROVIDED", "PARTIAL", "NONE"] as const;
export const POSTING_OVERTIME = ["NONE", "SOMETIMES", "REGULAR"] as const;
export const POSTING_SHIFT = ["DAY", "TWO_SHIFT", "THREE_SHIFT", "NIGHT"] as const;

export type PostingDormitory = (typeof POSTING_DORMITORY)[number];
export type PostingMeals = (typeof POSTING_MEALS)[number];
export type PostingOvertime = (typeof POSTING_OVERTIME)[number];
export type PostingShift = (typeof POSTING_SHIFT)[number];

const id = z.string().trim().min(1).max(64);
const code = z.string().trim().min(1).max(64);

/** Empty select → null. */
function optionalEnum<T extends readonly [string, ...string[]]>(values: T) {
  return z
    .union([z.literal(""), z.enum(values)])
    .nullish()
    .transform((v) => (v ? v : null));
}

const won = z.coerce.number().int().min(1).max(POSTING_PAY_MAX_KRW);

export const postingCreateSchema = z
  .object({
    leadId: id,
    blindTitle: z.string().trim().min(1).max(POSTING_TITLE_MAX),
    role: z.string().trim().min(1).max(POSTING_ROLE_MAX),
    industryCode: code,
    sido: code,
    sigungu: z
      .string()
      .trim()
      .max(64)
      .nullish()
      .transform((v) => (v ? v : null)),
    payMin: won,
    payMax: z
      .union([z.literal(""), won])
      .nullish()
      .transform((v) => (v === "" || v == null ? null : v)),
    overtimeNote: optionalEnum(POSTING_OVERTIME),
    dormitory: z.enum(POSTING_DORMITORY),
    meals: optionalEnum(POSTING_MEALS),
    shift: optionalEnum(POSTING_SHIFT),
    headcount: z.coerce.number().int().min(1).max(POSTING_HEADCOUNT_MAX),
    eligibleVisas: z.array(code).min(1).max(64),
  })
  .refine((v) => v.payMax == null || v.payMax >= v.payMin, {
    path: ["payMax"],
    message: "payMaxBelowMin",
  });

export type PostingCreateInput = z.output<typeof postingCreateSchema>;

export const postingIdSchema = z.object({ postingId: id });
