import { type NextRequest, NextResponse } from "next/server";

import { type Locale, defaultLocale, locales } from "@/i18n/locales";
import { sendPhoneOtp } from "@/lib/authCredentials";
import { clientIp } from "@/lib/rateLimit";
import { otpApiRequestSchema } from "@/schemas/auth/auth";

/**
 * POST /api/seeker/otp — sends a phone OTP (R-104). Body: `{ phone, purpose?, locale? }`.
 * 200 `{ resendAvailableAt, expiresAt }` · 400 VALIDATION · 429 RATE_LIMITED / RESEND_TOO_SOON /
 * HOURLY_LIMIT / OTP_LOCKED with `Retry-After` (R-129, STANDARD 5 error format).
 */
function toLocale(value: string | undefined): Locale {
  return (locales as readonly string[]).includes(value ?? "") ? (value as Locale) : defaultLocale;
}

function error(status: number, code: string, message: string, retryAfterSec?: number) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: retryAfterSec ? { "Retry-After": String(retryAfterSec) } : undefined },
  );
}

export async function POST(request: NextRequest) {
  // rbac: public — OTP 요청은 비로그인 공개 기능 (STANDARD 4.5 공개 예외, IP·번호별 속도 제한)
  const json: unknown = await request.json().catch(() => null);
  const parsed = otpApiRequestSchema.safeParse(json);
  if (!parsed.success) return error(400, "VALIDATION", "phone is required");
  const { phone, purpose, locale } = parsed.data;

  const result = await sendPhoneOtp({
    phone,
    purpose,
    locale: toLocale(locale),
    ip: clientIp(request.headers),
  });
  if (result.ok) {
    return NextResponse.json({
      resendAvailableAt: result.resendAvailableAt.toISOString(),
      expiresAt: result.expiresAt.toISOString(),
    });
  }
  switch (result.code) {
    case "INVALID_PHONE":
      return error(400, "VALIDATION", "invalid phone number");
    case "LOCKED":
      return error(429, "OTP_LOCKED", "too many wrong codes", result.retryAfterSec);
    default:
      return error(429, result.code, "too many OTP requests", result.retryAfterSec);
  }
}
