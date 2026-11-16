/**
 * Phone OTP (PRD R-104, PLAN P1b-2).
 *
 * - The code is never stored: `OtpChallenge.codeHash` = HMAC(HASH_KEY) of phoneHash + code.
 *   The phone itself is stored only as `phoneHash` (STANDARD 4.7).
 * - Resend: a phone gets a new code at most once per OTP_RESEND_INTERVAL_SEC (60s) and at most
 *   OTP_MAX_PER_HOUR (5) times per hour.
 * - Wrong codes: the OTP_MAX_ATTEMPTS-th (5th) wrong code locks the phone for OTP_LOCK_SEC — no new
 *   code and no verification (even with the right code) until the lock ends.
 * - Delivery goes through the NotificationProvider. In development that is the console adapter,
 *   which prints the code (the only allowed place, STANDARD 4.7); production never logs it.
 * - Request and verify for one phone are serialised with a transaction-scoped advisory lock, so two
 *   parallel requests cannot both slip under a limit.
 * Every function takes `now` so tests run on a fake clock.
 */
import { randomInt, timingSafeEqual } from "node:crypto";

import {
  OTP_CODE_LENGTH,
  OTP_HOURLY_WINDOW_SEC,
  OTP_LOCK_SEC,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_PER_HOUR,
  OTP_RESEND_INTERVAL_SEC,
  OTP_TTL_SEC,
} from "@/config/limits";
import type { Locale } from "@/i18n/locales";
import type { OtpPurpose } from "@/schemas/auth/auth";

import { hmacHash } from "./crypto";
import { db } from "./db";
import { getNotificationProvider, type NotificationProvider } from "./notifications";

export { OTP_PURPOSES, type OtpPurpose } from "@/schemas/auth/auth";

export type OtpRequestResult =
  | { ok: true; expiresAt: Date; resendAvailableAt: Date }
  | { ok: false; code: "RESEND_TOO_SOON" | "HOURLY_LIMIT" | "LOCKED"; retryAfterSec: number };

export type OtpVerifyResult =
  | { ok: true; phoneHash: string }
  | { ok: false; code: "INVALID_CODE"; attemptsLeft: number }
  | { ok: false; code: "LOCKED"; retryAfterSec: number }
  | { ok: false; code: "EXPIRED" | "NO_CHALLENGE" };

const SEC = 1000;

/** `User.phoneHash` / `OtpChallenge.phoneHash` for an E.164 number (normalizePhone first). */
export function phoneHashOf(e164: string): string {
  return hmacHash(e164);
}

function secondsUntil(target: number, now: Date): number {
  return Math.max(1, Math.ceil((target - now.getTime()) / SEC));
}

/** `OtpChallenge.codeHash` value (exported for tests). */
export function codeHashOf(phoneHash: string, code: string): string {
  return hmacHash(`otp:${phoneHash}:${code}`);
}

function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Zero-padded numeric code from a CSPRNG. */
export function generateOtpCode(): string {
  return randomInt(0, 10 ** OTP_CODE_LENGTH)
    .toString()
    .padStart(OTP_CODE_LENGTH, "0");
}

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

async function lockPhone(tx: Tx, phoneHash: string): Promise<void> {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`otp:${phoneHash}`}))::text AS locked`;
}

/** Remaining lock seconds for the phone, or 0 when it is not locked. */
async function lockedFor(tx: Tx, phoneHash: string, now: Date): Promise<number> {
  const locked = await tx.otpChallenge.findFirst({
    where: { phoneHash, lockedAt: { gt: new Date(now.getTime() - OTP_LOCK_SEC * SEC) } },
    orderBy: { lockedAt: "desc" },
    select: { lockedAt: true },
  });
  if (!locked?.lockedAt) return 0;
  return secondsUntil(locked.lockedAt.getTime() + OTP_LOCK_SEC * SEC, now);
}

export type RequestOtpInput = {
  /** E.164 (normalizePhone). */
  phone: string;
  purpose: OtpPurpose;
  locale: Locale;
  now?: Date;
  notifier?: NotificationProvider;
  /** Test hook: fixed code instead of a random one. */
  code?: string;
};

export async function requestOtp(input: RequestOtpInput): Promise<OtpRequestResult> {
  const now = input.now ?? new Date();
  const phoneHash = phoneHashOf(input.phone);
  const code = input.code ?? generateOtpCode();

  const result = await db.$transaction(async (tx): Promise<OtpRequestResult> => {
    await lockPhone(tx, phoneHash);

    const lockSec = await lockedFor(tx, phoneHash, now);
    if (lockSec > 0) return { ok: false, code: "LOCKED", retryAfterSec: lockSec };

    const hourAgo = new Date(now.getTime() - OTP_HOURLY_WINDOW_SEC * SEC);
    const recent = await tx.otpChallenge.findMany({
      where: { phoneHash, createdAt: { gt: hourAgo } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    const last = recent.at(-1);
    if (last && now.getTime() - last.createdAt.getTime() < OTP_RESEND_INTERVAL_SEC * SEC) {
      return {
        ok: false,
        code: "RESEND_TOO_SOON",
        retryAfterSec: secondsUntil(last.createdAt.getTime() + OTP_RESEND_INTERVAL_SEC * SEC, now),
      };
    }
    if (recent.length >= OTP_MAX_PER_HOUR) {
      const oldest = recent[0].createdAt.getTime();
      return {
        ok: false,
        code: "HOURLY_LIMIT",
        retryAfterSec: secondsUntil(oldest + OTP_HOURLY_WINDOW_SEC * SEC, now),
      };
    }

    // A new code replaces every open one for this phone.
    await tx.otpChallenge.updateMany({
      where: { phoneHash, consumedAt: null, expiresAt: { gt: now } },
      data: { expiresAt: now },
    });
    const expiresAt = new Date(now.getTime() + OTP_TTL_SEC * SEC);
    await tx.otpChallenge.create({
      data: {
        phoneHash,
        codeHash: codeHashOf(phoneHash, code),
        purpose: input.purpose,
        expiresAt,
        createdAt: now,
      },
    });
    return {
      ok: true,
      expiresAt,
      resendAvailableAt: new Date(now.getTime() + OTP_RESEND_INTERVAL_SEC * SEC),
    };
  });

  if (result.ok) {
    const notifier = input.notifier ?? getNotificationProvider();
    await notifier.send({
      channel: "SMS",
      to: input.phone,
      templateKey: "common.otp.sms",
      locale: input.locale,
      params: { code },
    });
  }
  return result;
}

export type VerifyOtpInput = {
  phone: string;
  code: string;
  purpose: OtpPurpose;
  now?: Date;
};

export async function verifyOtp(input: VerifyOtpInput): Promise<OtpVerifyResult> {
  const now = input.now ?? new Date();
  const phoneHash = phoneHashOf(input.phone);

  return db.$transaction(async (tx): Promise<OtpVerifyResult> => {
    await lockPhone(tx, phoneHash);

    const lockSec = await lockedFor(tx, phoneHash, now);
    if (lockSec > 0) return { ok: false, code: "LOCKED", retryAfterSec: lockSec };

    const challenge = await tx.otpChallenge.findFirst({
      where: { phoneHash, purpose: input.purpose, consumedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (!challenge) return { ok: false, code: "NO_CHALLENGE" };
    if (challenge.expiresAt.getTime() <= now.getTime()) return { ok: false, code: "EXPIRED" };

    if (sameHash(challenge.codeHash, codeHashOf(phoneHash, input.code.trim()))) {
      await tx.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: now } });
      return { ok: true, phoneHash };
    }

    const attempts = challenge.attempts + 1;
    if (attempts >= OTP_MAX_ATTEMPTS) {
      await tx.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts, lockedAt: now, expiresAt: now },
      });
      return { ok: false, code: "LOCKED", retryAfterSec: OTP_LOCK_SEC };
    }
    await tx.otpChallenge.update({ where: { id: challenge.id }, data: { attempts } });
    return { ok: false, code: "INVALID_CODE", attemptsLeft: OTP_MAX_ATTEMPTS - attempts };
  });
}
