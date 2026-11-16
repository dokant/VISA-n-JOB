import { z } from "zod";

/**
 * 관리자 구직자 검토 입력 (R-120) — server actions parse FormData with these (STANDARD 4.6).
 * Checkboxes submit "true" when checked and nothing (null) when not; anything else is refused.
 */
const id = z.string().trim().min(1).max(64);
const flag = z.union([z.literal("true"), z.null()]).transform((v) => v === "true");

export const seekerGradeChangeSchema = z.object({
  seekerId: id,
  to: z.enum(["B", "A", "S"]),
});

export const seekerTrackChangeSchema = z.object({
  seekerId: id,
  to: z.enum(["JOB_MATCH", "FUTURE_POOL", "CONSULT_ONLY"]),
});

export const seekerReviewFlagsSchema = z.object({
  seekerId: id,
  consulted: flag,
  verifiedVisa: flag,
  verifiedKorean: flag,
});

/** convertibleVisa: "" = 판정 없음 (지움). convertibleAt: YYYY-MM-DD from `<input type="date">`. */
export const seekerConvertibilitySchema = z.object({
  seekerId: id,
  convertibleVisa: z
    .string()
    .trim()
    .max(16)
    .transform((v) => (v === "" ? null : v)),
  convertibleAt: z
    .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
    .transform((v) => (v === "" ? null : new Date(`${v}T00:00:00+09:00`))),
});

export const seekerPiiRevealSchema = z.object({
  seekerId: id,
  group: z.enum(["basic", "contact"]),
});
