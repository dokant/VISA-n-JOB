import { z } from "zod";

import { ADMIN_AMOUNT_MAX_KRW } from "@/config/limits";

/** 계약(Placement) 관리자 입력 (R-216). Amounts in KRW; the contract date in KST. */
export const FEE_STATUSES = ["UNBILLED", "BILLED", "PAID", "WAIVED"] as const;
export type FeeStatus = (typeof FEE_STATUSES)[number];

const id = z.string().trim().min(1).max(64);
const won = z.coerce.number().int().min(0).max(ADMIN_AMOUNT_MAX_KRW);
const kstDay = z
  .string()
  .trim()
  .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)
  .transform((v) => new Date(`${v}T00:00:00+09:00`))
  .refine((d) => !Number.isNaN(d.getTime()));

const fields = {
  contractDate: kstDay,
  monthlyWage: won,
  feeAmount: won,
  feeStatus: z.enum(FEE_STATUSES),
};

export const placementCreateSchema = z.object({ recommendationId: id, ...fields });
export const placementUpdateSchema = z.object({ placementId: id, ...fields });
