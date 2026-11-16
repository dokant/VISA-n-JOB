import { z } from "zod";

import { DIAGNOSIS_FOREIGN_ROWS_MAX } from "@/config/limits";

/**
 * 무료 채용 진단 form (R-124, WO §9.1) — shared by the client form and the server action.
 * Inputs: 업종(KSIC), 시·군·구, 상시근로자 수, 내국인 피보험자 수, 현재 외국인 고용 현황(비자별 인원).
 * Values are reference codes / counts only; there is no free text and no contact field.
 * Error messages are codes rendered as `errors.field.{code}`.
 */
const code = z.string().trim().min(1, "required").max(40, "invalidValue");
/** Head counts: whole numbers. The upper bound only protects storage (STANDARD S-53). */
/** "" → missing ("required"); "12" → 12; anything else is left for z.number() to refuse. */
const toNumber = (v: unknown) => {
  if (v === "" || v === null || v === undefined) return undefined;
  if (typeof v !== "string") return v;
  const t = v.trim().replace(/,/g, "");
  if (t === "") return undefined;
  return /^-?[0-9]+(.[0-9]+)?$/.test(t) ? Number(t) : t;
};
const count = z.preprocess(
  toNumber,
  z
    .number({ required_error: "required", invalid_type_error: "invalidNumber" })
    .int("invalidNumber")
    .min(0, "invalidNumber")
    .max(1_000_000, "invalidNumber"),
);

export const foreignWorkerRowSchema = z.object({
  visaCode: code,
  count: count.refine((n) => n >= 1, "invalidNumber"),
});

export const diagnosisSchema = z
  .object({
    industryCode: code,
    sido: code,
    sigungu: code,
    regularEmployees: count,
    insuredDomestic: count,
    foreignWorkers: z.array(foreignWorkerRowSchema).max(DIAGNOSIS_FOREIGN_ROWS_MAX, "tooMany"),
  })
  .superRefine((v, ctx) => {
    const seen = new Set<string>();
    v.foreignWorkers.forEach((row, i) => {
      if (seen.has(row.visaCode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "duplicateVisa",
          path: ["foreignWorkers", i, "visaCode"],
        });
      }
      seen.add(row.visaCode);
    });
  });

export type DiagnosisInput = z.input<typeof diagnosisSchema>;
export type DiagnosisValues = z.output<typeof diagnosisSchema>;
