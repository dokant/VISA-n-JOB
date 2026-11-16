import { z } from "zod";

import { locales } from "@/i18n/locales";
import { otpCodeField, phoneField } from "@/schemas/auth/auth";

import { referralCodeInput } from "./fields";

/**
 * Wizard Step 0 시작 (WO §7.3): locale, phone + OTP, referralCode. Completing it creates the seeker
 * account (User + SeekerProfile, completedStep 0) and signs in.
 */
export const step0Schema = z.object({
  locale: z.enum(locales, { message: "required" }),
  phone: phoneField,
  code: otpCodeField,
  referralCode: referralCodeInput,
});
export type Step0Input = z.input<typeof step0Schema>;

/** "인증번호 받기" part of Step 0 (and of the quick signup). */
export const step0SendSchema = step0Schema.pick({ locale: true, phone: true });
export type Step0SendInput = z.input<typeof step0SendSchema>;
