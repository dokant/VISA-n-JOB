"use server";

import { AuthError } from "next-auth";
import { cookies, headers } from "next/headers";

import { signIn } from "@/auth";
import { type Locale, defaultLocale, locales } from "@/i18n/locales";
import { createSeekerSignupProof, sendPhoneOtp } from "@/lib/authCredentials";
import { clientIp } from "@/lib/rateLimit";
import { type EntryParams, quickSignup, startWizardAccount } from "@/lib/seeker/account";
import { REF_COOKIE, SRC_COOKIE } from "@/lib/seeker/referral";
import { type StepId, saveWizardStep } from "@/lib/seeker/saveStep";
import { requireSeeker } from "@/lib/seeker/session";
import { quickSchema } from "@/schemas/seeker/quick";
import { step0Schema, step0SendSchema } from "@/schemas/seeker/register/step0";

/**
 * Seeker registration server actions (R-105 ~ R-111). Form errors come back as codes; the forms
 * render them as `errors.field.*` / `errors.auth.*` / `seeker.register.blocked.*`.
 * On success the browser navigates itself (`redirectTo`) so the new session cookie is sent with
 * the next full request.
 */
export type OtpSendState =
  { ok: true; resendAfterSec: number } | { ok: false; code: string; retryAfterSec?: number };

export type RegisterActionState =
  | { ok: true; redirectTo: string }
  | {
      ok: false;
      code: string;
      reason?: string;
      retryAfterSec?: number;
      fieldErrors?: Record<string, string>;
    };

function toLocale(value: unknown): Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value)
    ? (value as Locale)
    : defaultLocale;
}

async function entryParams(): Promise<EntryParams> {
  const jar = await cookies();
  return { ref: jar.get(REF_COOKIE)?.value ?? null, src: jar.get(SRC_COOKIE)?.value ?? null };
}

async function clearEntryParams(): Promise<void> {
  const jar = await cookies();
  jar.delete(REF_COOKIE);
  jar.delete(SRC_COOKIE);
}

/** Server-side sign-in with the one-time proof of the account just created / found. */
async function signInSeekerById(userId: string): Promise<string | null> {
  try {
    await signIn("seeker-signup", { proof: createSeekerSignupProof(userId), redirect: false });
    return null;
  } catch (e) {
    if (e instanceof AuthError) return "INVALID_CREDENTIALS";
    throw e;
  }
}

function fieldErrorsOf(issues: ReadonlyArray<{ path: (string | number)[]; message: string }>) {
  const out: Record<string, string> = {};
  for (const i of issues) out[i.path.join(".")] ??= i.message;
  return out;
}

/** "인증번호 받기" on the wizard Step 0 and the quick signup (SIGNUP OTP, R-104 limits). */
export async function requestSignupOtp(input: {
  phone: string;
  locale: string;
}): Promise<OtpSendState> {
  // rbac: public — 간편 등록·정식 등록 시작 전 OTP 요청 (STANDARD 4.5 공개 예외, 속도 제한)
  const parsed = step0SendSchema.safeParse({ ...input, locale: toLocale(input.locale) });
  if (!parsed.success) return { ok: false, code: "INVALID_PHONE" };
  const now = new Date();
  const r = await sendPhoneOtp({
    phone: parsed.data.phone,
    purpose: "SIGNUP",
    locale: parsed.data.locale,
    ip: clientIp(await headers()),
    now,
  });
  if (!r.ok) return { ok: false, code: r.code, retryAfterSec: r.retryAfterSec };
  return {
    ok: true,
    resendAfterSec: Math.ceil((r.resendAvailableAt.getTime() - now.getTime()) / 1000),
  };
}

/** Wizard Step 0 (R-106): verify the OTP, create (or find) the account and sign in. */
export async function startRegistration(input: unknown): Promise<RegisterActionState> {
  // rbac: public — 정식 등록 시작 (비로그인 상태, OTP로 본인 번호 확인)
  const parsed = step0Schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION", fieldErrors: fieldErrorsOf(parsed.error.issues) };
  }
  const v = parsed.data;
  const r = await startWizardAccount({
    phone: v.phone,
    code: v.code,
    locale: v.locale,
    referralCode: v.referralCode,
    entry: await entryParams(),
  });
  if (!r.ok) {
    if (r.code === "INVALID_REFERRAL_CODE") {
      return {
        ok: false,
        code: "VALIDATION",
        fieldErrors: { referralCode: "invalidReferralCode" },
      };
    }
    return {
      ok: false,
      code: r.code,
      retryAfterSec: "retryAfterSec" in r ? r.retryAfterSec : undefined,
    };
  }
  if (r.created) await clearEntryParams();
  const failed = await signInSeekerById(r.userId);
  if (failed) return { ok: false, code: failed };
  return { ok: true, redirectTo: `/${v.locale}/seeker/register` };
}

/** 간편 등록 (R-105): one screen, then the completion screen (R-112). */
export async function quickRegister(input: unknown): Promise<RegisterActionState> {
  // rbac: public — 간편 등록 (STANDARD 4.5 공개 예외, OTP로 본인 번호 확인)
  const parsed = quickSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION", fieldErrors: fieldErrorsOf(parsed.error.issues) };
  }
  const r = await quickSignup({
    input: parsed.data,
    entry: await entryParams(),
    ip: clientIp(await headers()),
  });
  if (!r.ok) {
    if (r.code === "BLOCKED") return { ok: false, code: "BLOCKED", reason: r.reason };
    if (r.code === "CONSENT_REQUIRED") {
      return { ok: false, code: "VALIDATION", fieldErrors: { blindProfile: "consentRequired" } };
    }
    return {
      ok: false,
      code: r.code,
      retryAfterSec: "retryAfterSec" in r ? r.retryAfterSec : undefined,
    };
  }
  if (r.created) await clearEntryParams();
  const failed = await signInSeekerById(r.userId);
  if (failed) return { ok: false, code: failed };
  const locale = parsed.data.locale;
  return {
    ok: true,
    redirectTo: r.created ? `/${locale}/seeker/register/complete` : `/${locale}/seeker/me`,
  };
}

const STEP_IDS: readonly StepId[] = ["1", "2", "3a", "3b", "4", "5a", "5b", "6", "7"];

/** Saves one wizard screen (R-106 / R-107 auto save) and tells the browser where to go next. */
export async function saveRegistrationStep(input: {
  step: string;
  locale: string;
  values: unknown;
}): Promise<RegisterActionState> {
  const actor = await requireSeeker(); // rbac: seeker:selfService (assertCan in requireSeeker)
  if (!(STEP_IDS as readonly string[]).includes(input.step)) {
    return { ok: false, code: "VALIDATION" };
  }
  const locale = toLocale(input.locale);
  const r = await saveWizardStep(input.step as StepId, input.values, {
    userId: actor.id,
    locale,
    ip: clientIp(await headers()),
    now: new Date(),
  });
  const base = `/${locale}/seeker/register`;
  if (r.ok) {
    if (r.next === "complete") return { ok: true, redirectTo: `${base}/complete` };
    const sub = r.next.sub ? `&sub=${r.next.sub}` : "";
    return { ok: true, redirectTo: `${base}?step=${r.next.step}${sub}` };
  }
  switch (r.code) {
    case "VALIDATION":
      return { ok: false, code: "VALIDATION", fieldErrors: r.fieldErrors };
    case "BLOCKED":
      return { ok: false, code: "BLOCKED", reason: r.reason };
    case "STEP_LOCKED": {
      const sub = r.resume.sub ? `&sub=${r.resume.sub}` : "";
      return { ok: true, redirectTo: `${base}?step=${r.resume.step}${sub}` };
    }
    default:
      return { ok: false, code: r.code };
  }
}
