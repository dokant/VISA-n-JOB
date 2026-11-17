import { z } from "zod";

import { locales } from "@/i18n/locales";

/**
 * 기업 계약 동의 (R-208, WO §9.4). The terms box is required; the 체류 업무 위임 동의 box is a
 * separate optional answer — the contract is complete without it.
 */
export const contractSignSchema = z.object({
  termsAgreed: z.boolean().refine((v) => v === true, "consentRequired"),
  visaMandate: z.boolean(),
  locale: z.enum(locales),
});
export type ContractSignInput = z.infer<typeof contractSignSchema>;
