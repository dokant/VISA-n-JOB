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

const bizRegNo = z
  .string()
  .trim()
  .min(1, "required")
  .refine((v) => normalizeBizRegNo(v) !== null, "invalidBizRegNo");

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
