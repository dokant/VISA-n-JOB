"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { signIn } from "@/auth";
import { type Locale, defaultLocale, locales } from "@/i18n/locales";
import { sendPhoneOtp } from "@/lib/authCredentials";
import { safeNextPath } from "@/lib/authGuard";
import { clientIp } from "@/lib/rateLimit";
import { seekerOtpRequestSchema, seekerOtpVerifySchema } from "@/schemas/auth/auth";

/** Codes rendered as `errors.auth.{code}` by the seeker login form. */
export type SeekerAuthState =
  { ok: true; resendAfterSec: number } | { ok: false; code: string; retryAfterSec?: number };

function toLocale(value: unknown): Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value)
    ? (value as Locale)
    : defaultLocale;
}

/** Step 1 of /[locale]/seeker/login: send the code (R-104). */
export async function requestSeekerOtp(input: {
  phone: string;
  locale: string;
}): Promise<SeekerAuthState> {
  // rbac: public — OTP 요청은 비로그인 공개 기능 (STANDARD 4.5 공개 예외, 속도 제한 R-104·R-129)
  const parsed = seekerOtpRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID_PHONE" };
  const now = new Date();
  const r = await sendPhoneOtp({
    phone: parsed.data.phone,
    purpose: "LOGIN",
    locale: toLocale(input.locale),
    ip: clientIp(await headers()),
    now,
  });
  if (!r.ok) return { ok: false, code: r.code, retryAfterSec: r.retryAfterSec };
  return {
    ok: true,
    resendAfterSec: Math.ceil((r.resendAvailableAt.getTime() - now.getTime()) / 1000),
  };
}

/** Step 2: verify the code and sign in with the `seeker-otp` provider. Redirects on success. */
export async function signInSeeker(input: {
  phone: string;
  code: string;
  locale: string;
  next?: string;
}): Promise<SeekerAuthState> {
  // rbac: public — 로그인 (비로그인 상태에서 호출, 검증·속도 제한은 authorize 안에서)
  const parsed = seekerOtpVerifySchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "OTP_INVALID" };
  try {
    await signIn("seeker-otp", { ...parsed.data, redirect: false });
  } catch (e) {
    if (e instanceof AuthError) {
      return {
        ok: false,
        code: (e as AuthError & { code?: string }).code ?? "INVALID_CREDENTIALS",
      };
    }
    throw e;
  }
  // P1c replaces the fallback with /seeker/me (마이페이지).
  const locale = toLocale(input.locale);
  redirect(`/${locale}${safeNextPath(input.next, "")}`);
}
