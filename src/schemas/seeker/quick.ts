import { z } from "zod";

import { locales } from "@/i18n/locales";
import { otpCodeField, phoneField } from "@/schemas/auth/auth";

import { codeField, mustCheck } from "./register/fields";

/**
 * 간편 등록 /seeker/register/quick (R-105, WO §7.2): ① 언어 ② 현재 비자 ③ 거주 시·도 ④ 휴대폰(OTP)
 * ⑤ 필수 동의. BLIND_PROFILE is required for visas whose track is JOB_MATCH (`quickSchemaFor`,
 * list computed on the server by classifyTrack).
 */
export const quickSchema = z.object({
  locale: z.enum(locales, { message: "required" }),
  visaCode: codeField,
  sido: codeField,
  phone: phoneField,
  code: otpCodeField,
  privacyRequired: mustCheck("consentRequired"),
  blindProfile: z.boolean(),
  notice: mustCheck("consentRequired"),
});
export type QuickInput = z.input<typeof quickSchema>;

/** "인증번호 받기" part of the quick signup. */
export const quickSendSchema = quickSchema.pick({ locale: true, phone: true });
export type QuickSendInput = z.input<typeof quickSendSchema>;

export function quickSchemaFor(blindRequiredVisaCodes: readonly string[]) {
  return quickSchema.superRefine((v, ctx) => {
    if (blindRequiredVisaCodes.includes(v.visaCode) && !v.blindProfile) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["blindProfile"],
        message: "consentRequired",
      });
    }
  });
}
