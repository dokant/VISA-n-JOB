import { z } from "zod";

import { ADMIN_AMOUNT_MAX_KRW } from "@/config/limits";

/**
 * 체류 사건(VisaCase) 관리자 입력 (R-216). BR-13: no 고유식별정보 input of any kind — there is no
 * field for it and no free-text field where it could be typed (Phase 3 collects it under a separate
 * consent). `targetVisa` must be a VisaType code (checked against the table on save).
 */
export const VISA_CASE_TYPES = ["CHANGE", "EXTEND", "REPORT", "OTHER"] as const;
export const VISA_CASE_STATUSES = ["OPEN", "IN_PROGRESS", "FILED", "DECIDED", "CLOSED"] as const;
export type VisaCaseType = (typeof VISA_CASE_TYPES)[number];
export type VisaCaseStatus = (typeof VISA_CASE_STATUSES)[number];

const id = z.string().trim().min(1).max(64);
const optionalId = z
  .string()
  .trim()
  .max(64)
  .optional()
  .transform((v) => (v ? v : null));
const optionalDay = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v))
  .transform((v) => (v ? new Date(`${v}T00:00:00+09:00`) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()));
const optionalWon = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? Number(v) : null))
  .refine((n) => n === null || (Number.isInteger(n) && n >= 0 && n <= ADMIN_AMOUNT_MAX_KRW));

const fields = {
  caseType: z.enum(VISA_CASE_TYPES),
  targetVisa: optionalId,
  status: z.enum(VISA_CASE_STATUSES),
  companyId: optionalId,
  mandateSignedAt: optionalDay,
  fee: optionalWon,
};

export const visaCaseCreateSchema = z.object({ seekerId: id, ...fields });
export const visaCaseUpdateSchema = z.object({ visaCaseId: id, ...fields });
