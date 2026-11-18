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
 * trusted, see `clientIp`). Failed attempts are counted per (account + IP) and, with a higher cap,
 * per account; a successful sign-in clears both (P1b QA O-7, P1c QA D-1 / Q-11). Wrong passwords or
 * codes sent from other addresses therefore do not lock the owner out until the account-wide cap is
 * reached. When the client address is unknown (`TRUST_PROXY` off) there is no (account + IP)
 * bucket: only the account-wide cap applies.
 * Failure results carry a code only — never which part (account / password) was wrong.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

import type { Role } from "@prisma/client";
import { authenticator } from "otplib";

import { getSiteConfig } from "@/config/site.config";
import {
  RATE_LIMITS,
  SEEKER_SIGNUP_PROOF_TTL_SEC,
  SESSION_MAX_AGE_SEC,
  STAFF_SESSION_MAX_AGE_SEC,
  TOTP_PROOF_TTL_SEC,
} from "@/config/limits";
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
import { isRole, isStaff } from "./rbac";

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

/** Account-wide failure bucket (higher cap). */
function identifierLimit(identifier: string): LimitEntry {
  return { key: `login:id:${rateLimitSubject(identifier)}`, rule: RATE_LIMITS.loginPerIdentifier };
}

/** Failure bucket of one account from one client address; none when the address is unknown. */
function identifierIpLimit(identifier: string, ip: string | null): LimitEntry | null {
  return ip
    ? {
        key: `login:idip:${rateLimitSubject(`${identifier}|${ip}`)}`,
        rule: RATE_LIMITS.loginPerIdentifierIp,
      }
    : null;
}

function ipLimit(ip: string | null): LimitEntry | null {
  return ip ? { key: `login:ip:${rateLimitSubject(ip)}`, rule: RATE_LIMITS.loginPerIp } : null;
}

/** Failure buckets of a sign-in: account-wide first, then (account + IP) when the IP is known. */
function failureLimits(identifier: string, ip: string | null): LimitEntry[] {
  const pair = identifierIpLimit(identifier, ip);
  return pair ? [identifierLimit(identifier), pair] : [identifierLimit(identifier)];
}

/**
 * Keys checked by the Auth.js route before a credentials callback is processed (429): account-wide
 * failures, (account + IP) failures and the per-IP attempts — the last two only for a known IP.
 */
export function loginRateLimitKeys(identifier: string, ip: string | null): LimitEntry[] {
  const byIp = ipLimit(ip);
  return byIp ? [...failureLimits(identifier, ip), byIp] : failureLimits(identifier, ip);
}

/**
 * Gate before checking credentials: refuses while a failure bucket is full (peek, not counted) and
 * counts this attempt against the per-IP limit.
 */
async function loginGate(
  identifier: string,
  ip: string | null,
  now: Date,
): Promise<RateLimitResult> {
  let last: RateLimitResult | null = null;
  for (const f of failureLimits(identifier, ip)) {
    last = await peekRateLimit(f.key, f.rule, now);
    if (!last.ok) return last;
  }
  const byIp = ipLimit(ip);
  return byIp ? consumeRateLimit(byIp.key, byIp.rule, now) : (last as RateLimitResult);
}

/** Records the outcome: a failure is counted in every failure bucket, a success clears them. */
async function loginOutcome(
  identifier: string,
  ip: string | null,
  ok: boolean,
  now: Date,
): Promise<void> {
  for (const f of failureLimits(identifier, ip)) {
    if (ok) await resetRateLimit(f.key);
    else await consumeRateLimit(f.key, f.rule, now);
  }
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
  await loginOutcome(identifier, args.ip, otp.ok, now);
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
  await loginOutcome(identifier, args.ip, allowed && valid, now);
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

type ProofPurpose = "totp-proof" | "seeker-signup";

function proofKey(purpose: ProofPurpose): Buffer {
  const secret = process.env.AUTH_SECRET ?? "";
  if (secret.length < 32) throw new Error("AUTH_SECRET is not set (>= 32 characters)");
  return createHmac("sha256", secret).update(`visanjob:${purpose}`).digest();
}

function sign(payload: string, purpose: ProofPurpose = "totp-proof"): string {
  return createHmac("sha256", proofKey(purpose)).update(payload).digest("base64url");
}

function createProof(userId: string, ttlSec: number, purpose: ProofPurpose, now: Date): string {
  const exp = Math.floor(now.getTime() / 1000) + ttlSec;
  const payload = `${userId}.${exp}`;
  return `${payload}.${sign(payload, purpose)}`;
}

/** The user id of a valid, unexpired proof, else null. */
function readProof(proof: unknown, purpose: ProofPurpose, now: Date): string | null {
  if (typeof proof !== "string") return null;
  const parts = proof.split(".");
  if (parts.length !== 3) return null;
  const [id, expRaw, sig] = parts;
  const exp = Number(expRaw);
  if (!id || !Number.isInteger(exp) || exp < Math.floor(now.getTime() / 1000)) return null;
  const expected = Buffer.from(sign(`${id}.${expRaw}`, purpose));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given) ? id : null;
}

/**
 * Proof handed to the Auth.js session update right after `verifyStaffTotp` succeeded. The JWT
 * callback upgrades `twoFactorVerified` only for a valid, unexpired proof of the same user, so a
 * client-side session update (POST /api/auth/session) cannot fake the second factor.
 */
export function createTotpProof(userId: string, now: Date = new Date()): string {
  return createProof(userId, TOTP_PROOF_TTL_SEC, "totp-proof", now);
}

export function verifyTotpProof(proof: unknown, userId: string, now: Date = new Date()): boolean {
  return readProof(proof, "totp-proof", now) === userId;
}

// ─── Seeker sign-in right after registration (R-105, R-106 Step 0) ───────────

/**
 * Proof created by the registration server action right after it verified the SIGNUP OTP and
 * created the account. The action hands it straight to `signIn("seeker-signup")` on the server
 * (it never reaches the browser); the OTP itself was already consumed by the registration.
 */
export function createSeekerSignupProof(userId: string, now: Date = new Date()): string {
  return createProof(userId, SEEKER_SIGNUP_PROOF_TTL_SEC, "seeker-signup", now);
}

export async function authorizeSeekerSignupProof(
  args: { proof: unknown } & Clock,
): Promise<AuthResult> {
  const userId = readProof(args.proof, "seeker-signup", args.now ?? new Date());
  if (!userId) return { ok: false, code: "INVALID_CREDENTIALS" };
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!user || user.role !== "SEEKER") return { ok: false, code: "NO_ACCOUNT" };
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: args.now ?? new Date() } });
  return {
    ok: true,
    user: { id: user.id, role: user.role, twoFactorVerified: false, totpEnrolled: false },
  };
}

// ─── Server-side sign-out for JWT sessions (integration QA I-1) ──────────────

/**
 * Every session token carries the account's `User.sessionVersion` as claim `sv`. Signing out raises
 * the number, so the server refuses every token issued before — a copied cookie, or one a request
 * still in flight at sign-out puts back into the browser. The check runs in the Node.js JWT
 * callback (`src/auth.ts`), i.e. in every `auth()` of pages, server actions and Route Handlers.
 * The Edge middleware cannot reach the database and only routes on the claims (it never decides
 * access on its own and never writes the session cookie).
 */
export type SessionClaimsWithVersion = {
  sub?: string | null;
  sv?: unknown;
  role?: unknown;
  /** seconds since epoch of the sign-in (set once by the JWT callback, never refreshed) */
  authTime?: unknown;
};

/**
 * Session lifetime of a role (STANDARD 4.11, Q-29): staff `STAFF_SESSION_MAX_AGE_SEC`, everyone
 * else `SESSION_MAX_AGE_SEC`.
 */
export function sessionMaxAgeSecOf(role: unknown): number {
  return isRole(role) && isStaff(role) ? STAFF_SESSION_MAX_AGE_SEC : SESSION_MAX_AGE_SEC;
}

/**
 * Absolute expiry (no sliding): a session ends `authTime + lifetime of its role` after the
 * sign-in, however often it is used. Auth.js re-signs the cookie (new JWT `exp`) on every
 * `/api/auth/session` call; `authTime` is copied unchanged, so this check cannot be pushed back.
 * A token without a numeric `authTime` counts as expired.
 */
export function isSessionExpired(claims: SessionClaimsWithVersion, nowSec: number): boolean {
  if (typeof claims.authTime !== "number" || !Number.isFinite(claims.authTime)) return true;
  return claims.authTime + sessionMaxAgeSecOf(claims.role) < nowSec;
}

/** Current session version of the account, or null when the account no longer exists. */
export async function sessionVersionOf(userId: string): Promise<number | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { sessionVersion: true },
  });
  return user ? user.sessionVersion : null;
}

/** True only for a token issued at the account's current version (tokens without `sv` fail). */
export function isSessionCurrent(tokenVersion: unknown, current: number | null): boolean {
  return current !== null && typeof tokenVersion === "number" && tokenVersion === current;
}

/**
 * JWT callback step: on sign-in stamps the current version into the token; afterwards returns null
 * (= no session, Auth.js clears the cookie where it can) unless the token is still current and
 * not past its absolute lifetime (`isSessionExpired`, every role — Q-29).
 */
export async function applySessionVersion<T extends SessionClaimsWithVersion>(
  token: T,
  signIn: boolean,
  now: Date = new Date(),
): Promise<(T & { sv: number }) | null> {
  if (!token.sub) return null;
  if (!signIn && isSessionExpired(token, Math.floor(now.getTime() / 1000))) return null;
  const current = await sessionVersionOf(token.sub);
  if (current === null) return null;
  if (signIn) return Object.assign(token, { sv: current });
  return isSessionCurrent(token.sv, current) ? (token as T & { sv: number }) : null;
}

/**
 * Sign-out (Auth.js `events.signOut`, every sign-out path): ends all sessions of the account issued
 * at the token's version. A token that is already stale changes nothing, so an old copied cookie
 * cannot be used to sign the owner out of a newer session. Returns whether the version was raised.
 */
export async function revokeSessions(token: SessionClaimsWithVersion | null): Promise<boolean> {
  if (!token?.sub || typeof token.sv !== "number") return false;
  const { count } = await db.user.updateMany({
    where: { id: token.sub, sessionVersion: token.sv },
    data: { sessionVersion: { increment: 1 } },
  });
  return count === 1;
}
