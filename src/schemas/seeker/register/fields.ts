import { z } from "zod";

import { REFERRAL_CODE_LENGTH } from "@/config/limits";
import { YES_NO, dayToDate, monthToDate } from "@/lib/seeker/options";

/**
 * Field building blocks of the seeker registration schemas (WO §7.3). Error messages are codes,
 * rendered as `errors.field.{code}` (STANDARD 3.6). Form values are strings / booleans / string
 * arrays exactly as the inputs hold them; the server converts them when saving.
 */

/** Reference code (VisaType / Region / Industry / option code). */
export const codeField = z.string().trim().min(1, "required").max(40, "tooLong");

/** Optional code: empty string = not answered. */
export const optionalCode = z.string().trim().max(40, "tooLong");

/** Optional short free text (internal only — never shown to employers, BR-14). */
export const optionalText = (max = 100) => z.string().trim().max(max, "tooLong");

/** Required choice from a fixed list. */
export const choice = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .refine((v) => v !== "", "required")
    .pipe(z.enum(values, { message: "invalidValue" }));

/** Optional choice: "" = not answered. */
export const optionalChoice = <T extends readonly [string, ...string[]]>(values: T) =>
  z.union([z.literal(""), z.enum(values, { message: "invalidValue" })]);

export const yesNo = choice(YES_NO);
export const optionalYesNo = optionalChoice(YES_NO);

/** "YYYY-MM" (month picker = year + month selects, STANDARD 3.1 no calendar). */
export const monthField = z
  .string()
  .min(1, "required")
  .refine((v) => monthToDate(v) !== null, "invalidMonth");
export const optionalMonth = z
  .string()
  .refine((v) => v === "" || monthToDate(v) !== null, "invalidMonth");

/** "YYYY-MM-DD". */
export const optionalDay = z
  .string()
  .refine((v) => v === "" || dayToDate(v) !== null, "invalidDate");

/** Four-digit year or "" (or "UNKNOWN" where 모름 is offered). */
export const optionalYear = z
  .string()
  .refine((v) => v === "" || v === "UNKNOWN" || /^[0-9]{4}$/.test(v), "invalidValue");

/** Referral code as typed (case-insensitive), "" = none. */
export const referralCodeInput = z
  .string()
  .trim()
  .toUpperCase()
  .refine(
    (v) => v === "" || new RegExp(`^[A-Z0-9]{${REFERRAL_CODE_LENGTH}}$`).test(v),
    "invalidReferralCode",
  );

/** Multi choice from a fixed list. */
export const multiChoice = <T extends readonly [string, ...string[]]>(values: T, max?: number) => {
  const base = z.array(z.enum(values, { message: "invalidValue" }));
  return max === undefined ? base : base.max(max, "tooMany");
};

/** Checkbox that must be ticked (visaConfirm, required consents). */
export const mustCheck = (code: "mustConfirm" | "consentRequired") =>
  z.boolean().refine((v) => v === true, code);
