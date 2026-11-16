/**
 * Seeker account creation (R-105 간편 등록, R-106 정식 등록 Step 0, R-109, R-111).
 *
 * Both entry points prove the phone with a SIGNUP OTP first. When the phone already belongs to a
 * seeker, nothing is created: the caller simply signs that seeker in (the OTP proved ownership), so
 * an interrupted registration continues where it stopped (R-107).
 *
 * New accounts: User(SEEKER, phoneEnc + phoneHash) + SeekerProfile(grade B, unique referralCode,
 * referredByCode / sourceChannel from `?ref` / `?src` — R-111). The quick signup also records the
 * required consents (R-110), creates the "프로필 완성" notice task (R-105) and the track tasks
 * (WO §7.4). A quick signup with a visa that cannot register is refused before anything is stored
 * (BR-08 / R-109) and the screen guides to a consult instead.
 */
import { Prisma } from "@prisma/client";

import type { Locale } from "@/i18n/locales";
import { db } from "@/lib/db";
import { verifyOtp } from "@/lib/otp";
import { normalizePhone } from "@/lib/phone";
import {
  type TrackBlockReason,
  classifyTrack,
  classifyVisa,
  listVisaTypesForTrack,
} from "@/lib/visa-engine/classifyTrack";

import { type RegistrationConsent } from "./options";
import { recordConsents } from "./consent";
import { generateReferralCode, normalizeReferralCode, normalizeSourceChannel } from "./referral";
import {
  createProfileCompletionTask,
  createRegistrationTasks,
  dispatchProfileCompletionNotice,
} from "./tasks";

export type RegisterFailure =
  | {
      ok: false;
      code:
        | "INVALID_PHONE"
        | "OTP_INVALID"
        | "OTP_EXPIRED"
        | "OTP_LOCKED"
        | "PHONE_TAKEN"
        | "INVALID_REFERENCE"
        | "INVALID_REFERRAL_CODE";
      retryAfterSec?: number;
      attemptsLeft?: number;
    }
  | { ok: false; code: "BLOCKED"; reason: TrackBlockReason };

export type RegisterResult = { ok: true; userId: string; created: boolean } | RegisterFailure;

/** `?ref` / `?src` values kept by the middleware cookies (R-111). */
export type EntryParams = { ref?: string | null; src?: string | null };

const MAX_CODE_ATTEMPTS = 5;

async function verifySignupOtp(
  phone: string,
  code: string,
  now: Date,
): Promise<{ ok: true; e164: string; phoneHash: string } | RegisterFailure> {
  const e164 = normalizePhone(phone);
  if (!e164) return { ok: false, code: "INVALID_PHONE" };
  const r = await verifyOtp({ phone: e164, code, purpose: "SIGNUP", now });
  if (r.ok) return { ok: true, e164, phoneHash: r.phoneHash };
  switch (r.code) {
    case "INVALID_CODE":
      return { ok: false, code: "OTP_INVALID", attemptsLeft: r.attemptsLeft };
    case "LOCKED":
      return { ok: false, code: "OTP_LOCKED", retryAfterSec: r.retryAfterSec };
    default:
      return { ok: false, code: "OTP_EXPIRED" };
  }
}

async function existingAccount(phoneHash: string): Promise<RegisterResult | null> {
  const user = await db.user.findUnique({ where: { phoneHash }, select: { id: true, role: true } });
  if (!user) return null;
  if (user.role !== "SEEKER") return { ok: false, code: "PHONE_TAKEN" };
  return { ok: true, userId: user.id, created: false };
}

/** referredByCode: a typed code must exist; a cookie code is kept only when it exists. */
async function resolveReferrer(
  typed: string | null | undefined,
  entry: EntryParams,
): Promise<{ ok: true; code: string | null } | { ok: false }> {
  const exists = async (code: string) =>
    (await db.seekerProfile.count({ where: { referralCode: code } })) > 0;
  if (typed) {
    const code = normalizeReferralCode(typed);
    return code && (await exists(code)) ? { ok: true, code } : { ok: false };
  }
  const fromCookie = normalizeReferralCode(entry.ref);
  return { ok: true, code: fromCookie && (await exists(fromCookie)) ? fromCookie : null };
}

function isReferralCodeClash(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === "P2002" &&
    JSON.stringify(e.meta?.target ?? "").includes("referralCode")
  );
}

/** Runs `create` with a fresh referral code, retrying on the (rare) unique clash. */
async function withReferralCode<T>(create: (code: string) => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await create(generateReferralCode());
    } catch (e) {
      if (!isReferralCodeClash(e) || attempt >= MAX_CODE_ATTEMPTS) throw e;
    }
  }
}

// ─── Wizard Step 0 (R-106) ────────────────────────────────────────────────────

export async function startWizardAccount(args: {
  phone: string;
  code: string;
  locale: Locale;
  referralCode?: string;
  entry?: EntryParams;
  now?: Date;
}): Promise<RegisterResult> {
  const now = args.now ?? new Date();
  const referrer = await resolveReferrer(args.referralCode || null, args.entry ?? {});
  if (!referrer.ok) return { ok: false, code: "INVALID_REFERRAL_CODE" };
  const otp = await verifySignupOtp(args.phone, args.code, now);
  if (!otp.ok) return otp;
  const existing = await existingAccount(otp.phoneHash);
  if (existing) return existing;

  const userId = await withReferralCode((referralCode) =>
    db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { role: "SEEKER", phoneEnc: otp.e164, phoneHash: otp.phoneHash, locale: args.locale },
        select: { id: true },
      });
      await tx.seekerProfile.create({
        data: {
          userId: user.id,
          referralCode,
          referredByCode: referrer.code,
          sourceChannel: normalizeSourceChannel(args.entry?.src),
          isQuickSignup: false,
          completedStep: 0,
          lastActiveConfirmedAt: now,
        },
      });
      return user.id;
    }),
  );
  return { ok: true, userId, created: true };
}

// ─── 간편 등록 (R-105) ────────────────────────────────────────────────────────

export type QuickSignupInput = {
  locale: Locale;
  visaCode: string;
  sido: string;
  phone: string;
  code: string;
  privacyRequired: boolean;
  blindProfile: boolean;
  notice: boolean;
};

export type QuickSignupResult =
  (RegisterResult & { ok: true }) | RegisterFailure | { ok: false; code: "CONSENT_REQUIRED" };

export async function quickSignup(args: {
  input: QuickSignupInput;
  entry?: EntryParams;
  ip: string | null;
  now?: Date;
}): Promise<QuickSignupResult> {
  const now = args.now ?? new Date();
  const { input } = args;

  // BR-08 / R-109: refuse before the OTP is used or anything is stored.
  const track = await classifyVisa({ visaCode: input.visaCode, now });
  if (!track.registrable) return { ok: false, code: "BLOCKED", reason: track.reason };
  const sido = await db.region.count({ where: { code: input.sido, level: "SIDO" } });
  if (sido === 0) return { ok: false, code: "INVALID_REFERENCE" };
  if (!input.privacyRequired || !input.notice) return { ok: false, code: "CONSENT_REQUIRED" };
  if (track.track === "JOB_MATCH" && !input.blindProfile) {
    return { ok: false, code: "CONSENT_REQUIRED" };
  }

  const referrer = await resolveReferrer(null, args.entry ?? {});
  const otp = await verifySignupOtp(input.phone, input.code, now);
  if (!otp.ok) return otp;
  const existing = await existingAccount(otp.phoneHash);
  if (existing) return existing;

  const consents: RegistrationConsent[] = ["PRIVACY_REQUIRED", "NOTICE"];
  if (input.blindProfile) consents.push("BLIND_PROFILE");

  const created = await withReferralCode((referralCode) =>
    db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          role: "SEEKER",
          phoneEnc: otp.e164,
          phoneHash: otp.phoneHash,
          locale: input.locale,
        },
        select: { id: true },
      });
      const profile = await tx.seekerProfile.create({
        data: {
          userId: user.id,
          visaCode: input.visaCode,
          sido: input.sido,
          track: track.track,
          needsVisaReview: track.needsVisaReview,
          grade: "B",
          isQuickSignup: true,
          completedStep: 0,
          referralCode,
          referredByCode: referrer.ok ? referrer.code : null,
          sourceChannel: normalizeSourceChannel(args.entry?.src),
          lastActiveConfirmedAt: now,
        },
        select: { id: true },
      });
      await recordConsents(tx, {
        userId: user.id,
        types: consents,
        locale: input.locale,
        ip: args.ip,
        now,
      });
      await createRegistrationTasks(tx, {
        seekerId: profile.id,
        autoConsult: track.autoConsult,
        needsVisaReview: track.needsVisaReview,
        now,
      });
      const taskId = await createProfileCompletionTask(tx, {
        seekerId: profile.id,
        locale: input.locale,
        now,
      });
      return { userId: user.id, taskId };
    }),
  );
  await dispatchProfileCompletionNotice({
    taskId: created.taskId,
    phone: otp.e164,
    locale: input.locale,
    now,
  });
  return { ok: true, userId: created.userId, created: true };
}

/** Visa codes whose quick signup needs BLIND_PROFILE (track JOB_MATCH without stay / school data). */
export async function blindRequiredVisaCodes(now: Date = new Date()): Promise<string[]> {
  const rows = await listVisaTypesForTrack();
  return rows
    .filter((row) => {
      const r = classifyTrack({ visaType: row, now });
      return r.registrable && r.track === "JOB_MATCH";
    })
    .map((row) => row.code);
}

/**
 * Profile row for a seeker account that has none yet (e.g. created before P1c). Registration data
 * stays empty; only the unique referral code is issued.
 */
export async function ensureSeekerProfile(userId: string): Promise<void> {
  const existing = await db.seekerProfile.findUnique({ where: { userId }, select: { id: true } });
  if (existing) return;
  await withReferralCode((referralCode) =>
    db.seekerProfile.create({ data: { userId, referralCode, completedStep: 0 } }),
  );
}
