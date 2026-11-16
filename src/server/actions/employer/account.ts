"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { signIn } from "@/auth";
import { RATE_LIMITS } from "@/config/limits";
import { type Locale, defaultLocale, locales } from "@/i18n/locales";
import { safeNextPath } from "@/lib/authGuard";
import { registerEmployer } from "@/lib/employerAccount";
import { clientIp, consumeRateLimit, rateLimitSubject } from "@/lib/rateLimit";
import {
  type EmployerLoginInput,
  type EmployerSignupInput,
  employerLoginSchema,
  employerSignupSchema,
} from "@/schemas/auth/auth";

/** Codes rendered as `errors.auth.{code}` by the employer forms. */
export type EmployerAuthState = { ok: false; code: string; field?: string };

function toLocale(value: unknown): Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value)
    ? (value as Locale)
    : defaultLocale;
}

async function signInEmployerOrCode(email: string, password: string): Promise<string | null> {
  try {
    await signIn("employer-password", { email, password, redirect: false });
    return null;
  } catch (e) {
    if (e instanceof AuthError) {
      return (e as AuthError & { code?: string }).code ?? "INVALID_CREDENTIALS";
    }
    throw e;
  }
}

/** /[locale]/employer/signup (R-123). Signs the new account in and redirects on success. */
export async function signUpEmployer(
  input: EmployerSignupInput & { locale: string },
): Promise<EmployerAuthState> {
  // rbac: public — 기업 회원가입 (비로그인 상태에서 호출, IP 속도 제한)
  const parsed = employerSignupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "VALIDATION" };

  // Per-IP signup limit only when the client address is trusted (TRUST_PROXY, P1b QA O-1).
  const ip = clientIp(await headers());
  if (ip) {
    const limited = await consumeRateLimit(
      `signup:ip:${rateLimitSubject(ip)}`,
      RATE_LIMITS.signupPerIp,
    );
    if (!limited.ok) return { ok: false, code: "RATE_LIMITED" };
  }

  const result = await registerEmployer(parsed.data);
  if (!result.ok) {
    const field =
      result.code === "BIZ_REG_NO_TAKEN" || result.code === "INVALID_BIZ_REG_NO"
        ? "bizRegNo"
        : result.code === "EMAIL_TAKEN"
          ? "email"
          : undefined;
    return { ok: false, code: result.code, field };
  }
  const code = await signInEmployerOrCode(parsed.data.email, parsed.data.password);
  if (code) return { ok: false, code };
  // P1d: a new employer lands on the 구인 의뢰 page (R-125).
  redirect(`/${toLocale(input.locale)}/employer/request`);
}

/** /[locale]/employer/login (R-123). */
export async function signInEmployer(
  input: EmployerLoginInput & { locale: string; next?: string },
): Promise<EmployerAuthState> {
  // rbac: public — 로그인 (비로그인 상태에서 호출, 검증·속도 제한은 authorize 안에서)
  const parsed = employerLoginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID_CREDENTIALS" };
  const code = await signInEmployerOrCode(parsed.data.email, parsed.data.password);
  if (code) return { ok: false, code };
  // P1d: the employer area is the 구인 의뢰 page (R-125); P2b may add 후보 열람.
  redirect(`/${toLocale(input.locale)}${safeNextPath(input.next, "/employer/request")}`);
}
