import { z } from "zod";

import { OTP_CODE_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/config/limits";
import { normalizePhone } from "@/lib/phone";

/**
 * Login / signup forms (R-104, R-118, R-123). Shared by the client forms (react-hook-form +
 * zodResolver) and the server actions / Auth.js `authorize` (STANDARD 4.6).
 *
 * Error messages are codes, rendered by the form as `errors.field.{code}` (STANDARD 3.6);
 * the Korean-only admin forms map the same codes to Korean text.
 */
export const FIELD_ERROR_CODES = [
  "required",
  "invalidPhone",
  "invalidCode",
  "invalidEmail",
  "invalidBizRegNo",
  "bizRegNoChecksum",
  "passwordTooShort",
  "passwordTooLong",
  "passwordMismatch",
  "tooLong",
] as const;
export type FieldErrorCode = (typeof FIELD_ERROR_CODES)[number];

const phone = z
  .string()
  .trim()
  .min(1, "required")
  .max(32, "invalidPhone")
  .refine((v) => normalizePhone(v) !== null, "invalidPhone");

const otpCode = z
  .string()
  .trim()
  .min(1, "required")
  .regex(new RegExp(`^[0-9]{${OTP_CODE_LENGTH}}$`), "invalidCode");

const email = z.string().trim().min(1, "required").max(254, "tooLong").email("invalidEmail");

/** Login password: any non-empty value (length rules apply only when one is set). */
const loginPassword = z.string().min(1, "required").max(PASSWORD_MAX_LENGTH, "passwordTooLong");

const newPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, "passwordTooShort")
  .max(PASSWORD_MAX_LENGTH, "passwordTooLong");

/** 사업자등록번호: 10 digits, dashes and spaces ignored ("123-45-67890"). */
export function normalizeBizRegNo(input: string): string | null {
  const digits = input.replace(/[\s-]/g, "");
  return /^[0-9]{10}$/.test(digits) ? digits : null;
}

/** 국세청 사업자등록번호 검증식: digits 1~9 weighted 1,3,7,1,3,7,1,3,5 (P1b QA O-4). */
const BIZ_REG_NO_WEIGHTS = [1, 3, 7, 1, 3, 7, 1, 3, 5] as const;

/** Check digit (10th digit) for the first nine digits of a 사업자등록번호. */
export function bizRegNoCheckDigit(firstNine: string): number {
  let sum = 0;
  BIZ_REG_NO_WEIGHTS.forEach((w, i) => {
    sum += Number(firstNine[i]) * w;
  });
  sum += Math.floor((Number(firstNine[8]) * 5) / 10);
  return (10 - (sum % 10)) % 10;
}

/** True when a normalised 10-digit number passes the checksum. */
export function isValidBizRegNoChecksum(digits: string): boolean {
  return /^[0-9]{10}$/.test(digits) && bizRegNoCheckDigit(digits) === Number(digits[9]);
}

/** Normalised digits when the format AND the checksum are valid, else null. */
export function validBizRegNo(input: string): string | null {
  const digits = normalizeBizRegNo(input);
  return digits && isValidBizRegNoChecksum(digits) ? digits : null;
}

const bizRegNo = z
  .string()
  .trim()
  .min(1, "required")
  .refine((v) => normalizeBizRegNo(v) !== null, "invalidBizRegNo")
  .refine((v) => {
    const digits = normalizeBizRegNo(v);
    return digits === null || isValidBizRegNoChecksum(digits);
  }, "bizRegNoChecksum");

const code = z.string().trim().min(1, "required").max(40, "tooLong");

// ─── Seeker phone OTP (R-104) ────────────────────────────────────────────────

export const seekerOtpRequestSchema = z.object({ phone });
export type SeekerOtpRequestInput = z.infer<typeof seekerOtpRequestSchema>;

export const seekerOtpVerifySchema = z.object({ phone, code: otpCode });
export type SeekerOtpVerifyInput = z.infer<typeof seekerOtpVerifySchema>;

/** OtpChallenge.purpose: SIGNUP (P1c 등록) / LOGIN. */
export const OTP_PURPOSES = ["SIGNUP", "LOGIN"] as const;
export type OtpPurpose = (typeof OTP_PURPOSES)[number];

/** POST /api/seeker/otp body. */
export const otpApiRequestSchema = z.object({
  phone: z.string().max(32),
  purpose: z.enum(OTP_PURPOSES).default("LOGIN"),
  locale: z.string().max(8).optional(),
});

// ─── Employer (R-123) ────────────────────────────────────────────────────────

export const employerSignupSchema = z
  .object({
    companyName: z.string().trim().min(1, "required").max(100, "tooLong"),
    bizRegNo,
    industryCode: code,
    sido: code,
    email,
    password: newPassword,
    passwordConfirm: z.string().min(1, "required"),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    message: "passwordMismatch",
    path: ["passwordConfirm"],
  });
export type EmployerSignupInput = z.infer<typeof employerSignupSchema>;

export const employerLoginSchema = z.object({ email, password: loginPassword });
export type EmployerLoginInput = z.infer<typeof employerLoginSchema>;

// ─── Staff (R-118, Korean-only admin) ────────────────────────────────────────

export const staffLoginSchema = z.object({ email, password: loginPassword });
export type StaffLoginInput = z.infer<typeof staffLoginSchema>;

export const totpCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "required")
    .regex(/^[0-9]{6}$/, "invalidCode"),
});
export type TotpCodeInput = z.infer<typeof totpCodeSchema>;
