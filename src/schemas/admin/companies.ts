import { z } from "zod";

/**
 * 관리자 기업 검증·계약 등록 (R-218). `verified` is the target state; `signedOn` is the contract day
 * as staff recorded it ("YYYY-MM-DD", KST), or "" to clear the contract.
 */
const id = z.string().trim().min(1).max(64);

export const companyVerifySchema = z.object({
  companyId: id,
  verified: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export const companyContractSchema = z.object({
  companyId: id,
  signedOn: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v))
    .transform((v) => (v === "" ? null : new Date(`${v}T00:00:00+09:00`)))
    .refine((d) => d === null || !Number.isNaN(d.getTime())),
});
