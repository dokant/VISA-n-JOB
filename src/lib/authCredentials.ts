/**
 * Credential checks behind the three Auth.js Credentials providers (PLAN P1b-1) and the staff TOTP
 * step (R-118). Kept apart from `src/auth.ts` so the rules are unit-tested without Next.js.
 *
 * - seeker-otp        (R-104): phone + OTP code → SEEKER user found by `phoneHash`.
 * - employer-password (R-123): e-mail + password → EMPLOYER user.
 * - staff-password    (R-118): e-mail + password → staff user with `twoFactorVerified = false`.
 *   The admin area stays closed until `verifyStaffTotp` succeeds and the session is upgraded with a
 *   short-lived proof (`createTotpProof` / `verifyTotpProof`).
 * R-129 login limits: every attempt counts against the per-IP limit (only when the address is
 * trusted, see `clientIp`). The per-identifier limit counts FAILED attempts only and is cleared by a
 * successful sign-in, so a third party cannot keep an account locked once its owner signs in
 * (P1b QA O-7); it still stops password / code guessing.
 * Failure results carry a code only — never which part (account / password) was wrong.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

import type { Role } from "@prisma/client";
import { authenticator } from "otplib";

import { getSiteConfig } from "@/config/site.config";
import { RATE_LIMITS, TOTP_PROOF_TTL_SEC } from "@/config/limits";
import type { Locale } from "@/i18n/locales";

import { db } from "./db";
import { phoneHashOf, requestOtp, verifyOtp, type OtpPurpose } from "./otp";
import { verifyPassword } from "./password";
import { normalizePhone } from "./phone";
import {
  consumeRateLimit,
  peekRateLimit,
  rateLimitSubject,
  resetRateLimit,
  type RateLimitResult,
  type RateLimitRule,
} from "./rateLimit";
import { isStaff } from "./rbac";

/** What the JWT callback copies into the token (no PII: no e-mail, no phone). */
export type AuthUser = {
  id: string;
  role: Role;
  twoFactorVerified: boolean;
  totpEnrolled: boolean;
};

export type AuthFailureCode =
  | "INVALID_CREDENTIALS"
  | "RATE_LIMITED"
  | "OTP_INVALID"
  | "OTP_EXPIRED"
  | "OTP_LOCKED"
  | "NO_ACCOUNT";

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; code: AuthFailureCode; retryAfterSec?: number; attemptsLeft?: number };

type Clock = { now?: Date };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

type LimitEntry = { key: string; rule: RateLimitRule };

function identifierLimit(identifier: string): LimitEntry {
  return { key: `login:id:${rateLimitSubject(identifier)}`, rule: RATE_LIMITS.loginPerIdentifier };
}

function ipLimit(ip: string | null): LimitEntry | null {
  return ip ? { key: `login:ip:${rateLimitSubject(ip)}`, rule: RATE_LIMITS.loginPerIp } : null;
}

/** Keys checked by the Auth.js route before a credentials callback is processed (429). */
export function loginRateLimitKeys(identifier: string, ip: string | null): LimitEntry[] {
  const byIp = ipLimit(ip);
  return byIp ? [identifierLimit(identifier), byIp] : [identifierLimit(identifier)];
}

/**
 * Gate before checking credentials: refuses while the identifier holds too many failures (peek, not
 * counted) and counts this attempt against the per-IP limit.
 */
async function loginGate(
  identifier: string,
  ip: string | null,
  now: Date,
): Promise<RateLimitResult> {
  const id = identifierLimit(identifier);
  const failures = await peekRateLimit(id.key, id.rule, now);
  if (!failures.ok) return failures;
  const byIp = ipLimit(ip);
  return byIp ? consumeRateLimit(byIp.key, byIp.rule, now) : failures;
}

/** Records the outcome: a failure is counted for the identifier, a success clears its counter. */
async function loginOutcome(identifier: string, ok: boolean, now: Date): Promise<void> {
  const id = identifierLimit(identifier);
  if (ok) await resetRateLimit(id.key);
  else await consumeRateLimit(id.key, id.rule, now);
}

/** Identifier used for the login limits: hashed phone (E.164) or normalised e-mail. */
export function loginIdentifier(kind: "phone" | "email", value: string): string | null {
  if (kind === "email") return value.trim() ? `email:${normalizeEmail(value)}` : null;
  const e164 = normalizePhone(value);
  return e164 ? `phone:${phoneHashOf(e164)}` : null;
}

// ─── Seeker phone OTP (R-104) ────────────────────────────────────────────────

export type OtpSendResult =
  | { ok: true; resendAvailableAt: Date; expiresAt: Date }
  | {
      ok: false;
      code: "INVALID_PHONE" | "RATE_LIMITED" | "RESEND_TOO_SOON" | "HOURLY_LIMIT" | "LOCKED";
      retryAfterSec?: number;
    };

/** Sends a code. Public: called before anyone is signed in (IP limit + per-phone OTP limits). */
export async function sendPhoneOtp(
  args: { phone: string; purpose: OtpPurpose; locale: Locale; ip: string | null } & Clock,
): Promise<OtpSendResult> {
  const now = args.now ?? new Date();
  const e164 = normalizePhone(args.phone);
  if (!e164) return { ok: false, code: "INVALID_PHONE" };
  if (args.ip) {
    const byIp = await consumeRateLimit(
      `otp:ip:${rateLimitSubject(args.ip)}`,
      RATE_LIMITS.otpRequestPerIp,
      now,
    );
    if (!byIp.ok) return { ok: false, code: "RATE_LIMITED", retryAfterSec: byIp.retryAfterSec };
  }
  const r = await requestOtp({ phone: e164, purpose: args.purpose, locale: args.locale, now });
  if (!r.ok) return { ok: false, code: r.code, retryAfterSec: r.retryAfterSec };
  return { ok: true, resendAvailableAt: r.resendAvailableAt, expiresAt: r.expiresAt };
}

export async function authorizeSeekerOtp(
  args: { phone: string; code: string; ip: string | null } & Clock,
): Promise<AuthResult> {
  const now = args.now ?? new Date();
  const e164 = normalizePhone(args.phone);
  if (!e164) return { ok: false, code: "INVALID_CREDENTIALS" };
  const phoneHash = phoneHashOf(e164);
  const identifier = `phone:${phoneHash}`;
  const limited = await loginGate(identifier, args.ip, now);
  if (!limited.ok) return { ok: false, code: "RATE_LIMITED", retryAfterSec: limited.retryAfterSec };

  const otp = await verifyOtp({ phone: e164, code: args.code, purpose: "LOGIN", now });
  await loginOutcome(identifier, otp.ok, now);
  if (!otp.ok) {
    switch (otp.code) {
      case "INVALID_CODE":
        return { ok: false, code: "OTP_INVALID", attemptsLeft: otp.attemptsLeft };
      case "LOCKED":
        return { ok: false, code: "OTP_LOCKED", retryAfterSec: otp.retryAfterSec };
      default:
        return { ok: false, code: "OTP_EXPIRED" };
    }
  }
  const user = await db.user.findUnique({
    where: { phoneHash },
    select: { id: true, role: true },
  });
  if (!user || user.role !== "SEEKER") return { ok: false, code: "NO_ACCOUNT" };
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: now } });
  return {
    ok: true,
    user: { id: user.id, role: user.role, twoFactorVerified: false, totpEnrolled: false },
  };
}

// ─── E-mail + password (R-118 staff, R-123 employer) ─────────────────────────

async function authorizePassword(
  args: { email: string; password: string; ip: string | null } & Clock,
  accept: (role: Role) => boolean,
): Promise<AuthResult> {
  const now = args.now ?? new Date();
  const email = normalizeEmail(args.email);
  const identifier = `email:${email}`;
  const limited = await loginGate(identifier, args.ip, now);
  if (!limited.ok) return { ok: false, code: "RATE_LIMITED", retryAfterSec: limited.retryAfterSec };

  const user = email
    ? await db.user.findUnique({
        where: { email },
        select: { id: true, role: true, password: true, totpEnabledAt: true },
      })
    : null;
  const allowed = user != null && accept(user.role);
  // Always run argon2 (dummy hash when there is no usable account): same timing either way.
  const valid = await verifyPassword(allowed ? user.password : null, args.password);
  await loginOutcome(identifier, allowed && valid, now);
  if (!allowed || !valid) return { ok: false, code: "INVALID_CREDENTIALS" };

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: now } });
  return {
    ok: true,
    user: {
      id: user.id,
      role: user.role,
      twoFactorVerified: false,
      totpEnrolled: user.totpEnabledAt != null,
    },
  };
}

export function authorizeEmployerPassword(
  args: { email: string; password: string; ip: string | null } & Clock,
): Promise<AuthResult> {
  return authorizePassword(args, (role) => role === "EMPLOYER");
}

export function authorizeStaffPassword(
  args: { email: string; password: string; ip: string | null } & Clock,
): Promise<AuthResult> {
  return authorizePassword(args, (role) => isStaff(role));
}

// ─── Staff TOTP (R-118) ──────────────────────────────────────────────────────

function totp(now: Date) {
  // One 30-second step either side tolerates small clock drift.
  return authenticator.clone({ epoch: now.getTime(), window: 1 });
}

export type TotpEnrollment =
  { status: "ENROLLED" } | { status: "PENDING"; secret: string; otpauthUri: string };

/**
 * Starts (or resumes) TOTP enrolment for a staff member without 2FA. The secret is stored
 * encrypted (`User.totpSecret`, db.ts extension) and shown once on the setup screen as a manual
 * key + otpauth URI (no QR library — PLAN P1b-4).
 */
export async function startTotpEnrollment(userId: string): Promise<TotpEnrollment> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, email: true, totpSecret: true, totpEnabledAt: true },
  });
  if (!user || !isStaff(user.role)) throw new Error("startTotpEnrollment: not a staff account");
  if (user.totpEnabledAt) return { status: "ENROLLED" };
  let secret = user.totpSecret;
  if (!secret) {
    secret = authenticator.generateSecret();
    await db.user.update({ where: { id: userId }, data: { totpSecret: secret } });
  }
  const otpauthUri = authenticator.keyuri(
    user.email ?? userId,
    getSiteConfig().brand.wordmark,
    secret,
  );
  return { status: "PENDING", secret, otpauthUri };
}

export type TotpVerifyResult =
  | { ok: true }
  | {
      ok: false;
      code: "INVALID_CODE" | "CODE_REUSED" | "RATE_LIMITED" | "NOT_ENROLLED";
      retryAfterSec?: number;
    };

/** TOTP time step (30-second counter) of `now`. */
function totpStepOf(now: Date): number {
  return Math.floor(now.getTime() / 1000 / authenticator.allOptions().step);
}

/**
 * Checks a TOTP code; the first valid code also finishes enrolment (`totpEnabledAt`).
 * Replay protection (P1b QA O-3): the matched time step is stored in `User.totpLastStep` with a
 * conditional update, so a code whose step is not newer than the last accepted one is refused —
 * even when two requests race with the same code.
 */
export async function verifyStaffTotp(
  args: { userId: string; code: string } & Clock,
): Promise<TotpVerifyResult> {
  const now = args.now ?? new Date();
  const limited = await consumeRateLimit(
    `totp:user:${rateLimitSubject(args.userId)}`,
    RATE_LIMITS.totpVerifyPerUser,
    now,
  );
  if (!limited.ok) return { ok: false, code: "RATE_LIMITED", retryAfterSec: limited.retryAfterSec };

  const user = await db.user.findUnique({
    where: { id: args.userId },
    select: { role: true, totpSecret: true, totpEnabledAt: true },
  });
  if (!user || !isStaff(user.role) || !user.totpSecret) return { ok: false, code: "NOT_ENROLLED" };
  const delta = totp(now).checkDelta(args.code.trim(), user.totpSecret);
  if (delta === null) return { ok: false, code: "INVALID_CODE" };
  const step = totpStepOf(now) + delta;
  const updated = await db.user.updateMany({
    where: {
      id: args.userId,
      OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }],
    },
    data: { totpEnabledAt: user.totpEnabledAt ?? now, lastLoginAt: now, totpLastStep: step },
  });
  if (updated.count === 0) return { ok: false, code: "CODE_REUSED" };
  return { ok: true };
}

/** Test / E2E helper: the current code for a secret at `now`. */
export function totpCodeAt(secret: string, now: Date = new Date()): string {
  return totp(now).generate(secret);
}

// ─── Session upgrade proof ───────────────────────────────────────────────────

function proofKey(): Buffer {
  const secret = process.env.AUTH_SECRET ?? "";
  if (secret.length < 32) throw new Error("AUTH_SECRET is not set (>= 32 characters)");
  return createHmac("sha256", secret).update("visanjob:totp-proof").digest();
}

function sign(payload: string): string {
  return createHmac("sha256", proofKey()).update(payload).digest("base64url");
}

/**
 * Proof handed to the Auth.js session update right after `verifyStaffTotp` succeeded. The JWT
 * callback upgrades `twoFactorVerified` only for a valid, unexpired proof of the same user, so a
 * client-side session update (POST /api/auth/session) cannot fake the second factor.
 */
export function createTotpProof(userId: string, now: Date = new Date()): string {
  const exp = Math.floor(now.getTime() / 1000) + TOTP_PROOF_TTL_SEC;
  const payload = `${userId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyTotpProof(proof: unknown, userId: string, now: Date = new Date()): boolean {
  if (typeof proof !== "string") return false;
  const parts = proof.split(".");
  if (parts.length !== 3) return false;
  const [id, expRaw, sig] = parts;
  if (id !== userId) return false;
  const exp = Number(expRaw);
  if (!Number.isInteger(exp) || exp < Math.floor(now.getTime() / 1000)) return false;
  const expected = Buffer.from(sign(`${id}.${expRaw}`));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
