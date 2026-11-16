import { type NextRequest, NextResponse } from "next/server";

import { handlers } from "@/auth";
import { loginIdentifier, loginRateLimitKeys } from "@/lib/authCredentials";
import { clientIp, peekRateLimit } from "@/lib/rateLimit";

/**
 * Auth.js endpoints (/api/auth/*). Credentials callbacks are checked against the R-129 login limits
 * first: a client that is already over the limit gets 429 in the STANDARD 5 error format instead
 * of reaching `authorize` (which counts every attempt itself, so server-side sign-ins are limited
 * the same way).
 */
const CALLBACK = /\/api\/auth\/callback\/(seeker-otp|employer-password|staff-password)$/;

export function GET(request: NextRequest) {
  // rbac: public — Auth.js 세션·CSRF 조회 (본인 세션만 반환)
  return handlers.GET(request);
}

export async function POST(request: NextRequest) {
  // rbac: public — 로그인 엔드포인트 (비로그인 상태에서 호출, 속도 제한 적용)
  const match = CALLBACK.exec(request.nextUrl.pathname);
  if (match) {
    const form = await request
      .clone()
      .formData()
      .catch(() => null);
    const kind = match[1] === "seeker-otp" ? "phone" : "email";
    const raw = form?.get(kind);
    const identifier = typeof raw === "string" ? loginIdentifier(kind, raw) : null;
    if (identifier) {
      for (const { key, rule } of loginRateLimitKeys(identifier, clientIp(request.headers))) {
        const r = await peekRateLimit(key, rule);
        if (!r.ok) {
          return NextResponse.json(
            { error: { code: "RATE_LIMITED", message: "too many sign-in attempts" } },
            { status: 429, headers: { "Retry-After": String(r.retryAfterSec) } },
          );
        }
      }
    }
  }
  return handlers.POST(request);
}
