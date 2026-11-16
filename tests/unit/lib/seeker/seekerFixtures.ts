/** Shared helpers for the P1c seeker registration tests (unique phones; the DB is never cleaned). */
import { db } from "@/lib/db";
import { requestOtp } from "@/lib/otp";
import { type QuickSignupInput, quickSignup, startWizardAccount } from "@/lib/seeker/account";
import { type StepId, saveWizardStep } from "@/lib/seeker/saveStep";

import { captureNotifier, randomPhone } from "../authFixtures";

export const OTP = "246810";

/** "YYYY-MM" `months` from now (negative = past). */
export function monthFromNow(months: number, now: Date = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + months, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Issues a SIGNUP OTP with a known code for `phone` (no message is printed). */
export async function signupOtp(phone: string, now: Date = new Date()): Promise<void> {
  const r = await requestOtp({
    phone,
    purpose: "SIGNUP",
    locale: "ko",
    code: OTP,
    notifier: captureNotifier(),
    now,
  });
  if (!r.ok) throw new Error(`OTP request failed: ${r.code}`);
}

export async function sido(): Promise<string> {
  const r = await db.region.findFirstOrThrow({ where: { level: "SIDO" }, select: { code: true } });
  return r.code;
}

export async function industry(): Promise<string> {
  const r = await db.industry.findFirstOrThrow({ select: { code: true } });
  return r.code;
}

/** Runs a quick signup end to end (OTP included). */
export async function quick(
  over: Partial<QuickSignupInput> = {},
  extra: {
    entry?: { ref?: string | null; src?: string | null };
    ip?: string | null;
    now?: Date;
  } = {},
) {
  const phone = over.phone ?? randomPhone();
  const now = extra.now ?? new Date();
  await signupOtp(phone, now);
  return quickSignup({
    now,
    input: {
      locale: "ko",
      visaCode: "F-4",
      sido: await sido(),
      phone,
      code: OTP,
      privacyRequired: true,
      blindProfile: true,
      notice: true,
      ...over,
    },
    entry: extra.entry,
    ip: extra.ip === undefined ? "203.0.113.10" : extra.ip,
  });
}

/** Creates a wizard account (Step 0) and returns its user id. */
export async function wizardAccount(phone: string = randomPhone(), referralCode = "") {
  await signupOtp(phone);
  const r = await startWizardAccount({ phone, code: OTP, locale: "ko", referralCode });
  if (!r.ok) throw new Error(`wizard start failed: ${r.code}`);
  return r.userId;
}

export function save(userId: string, step: StepId, values: unknown, now = new Date()) {
  return saveWizardStep(step, values, { userId, locale: "vi", ip: "198.51.100.7", now });
}

/** Valid answers for every screen (visa / dates adjustable). */
export async function answers(
  opts: { visaCode?: string; stayExpiry?: string; graduationDate?: string } = {},
) {
  const region = await sido();
  const ind = await industry();
  return {
    "1": {
      legalName: "NGUYEN VAN A",
      nationality: "VN",
      sido: region,
      sigungu: "",
      messengerType: "ZALO",
      messengerId: "nguyen.a",
      email: "",
      birthYear: "1995",
      gender: "MALE",
    },
    "2": {
      visaCode: opts.visaCode ?? "F-4",
      visaSubType: "",
      stayExpiry: opts.stayExpiry ?? monthFromNow(18),
      hasArc: "YES",
      entryYear: "2020",
      pendingApplication: "NO",
      visaConfirm: true,
    },
    "3a": {
      educationLevel: "BACHELOR",
      major: "Mechanical",
      schoolName: "",
      graduationDate: opts.graduationDate ?? "",
    },
    "3b": { topikLevel: "3", kiipStage: "2", koreanSpeaking: "3", otherLanguages: ["en"] },
    "4": {
      experiences: [
        { country: "VN", industryCode: ind, role: "WELDING", months: "24", employerName: "ABC Co" },
      ],
      skills: ["WELDING"],
      licenses: [],
    },
    "5a": {
      jobSearchStatus: "IMMEDIATE",
      availableFrom: "",
      desiredIndustries: [ind],
      desiredRegions: ["ANY"],
    },
    "5b": {
      needDormitory: "YES",
      shiftOk: "CONDITIONAL",
      desiredPayMin: "2400000",
      groupApply: "NO",
      groupFriendCode: "",
    },
    "6": { nextVisaGoal: "", wantsConsult: "NO", consultTime: [] },
  } as const;
}

/** Saves Step 1 ~ 6 for a wizard account. Throws when a save fails. */
export async function fillSteps(
  userId: string,
  opts: Parameters<typeof answers>[0] = {},
  until: StepId = "6",
) {
  const a = await answers(opts);
  for (const step of ["1", "2", "3a", "3b", "4", "5a", "5b", "6"] as const) {
    const r = await save(userId, step, a[step]);
    if (!r.ok) throw new Error(`step ${step} failed: ${JSON.stringify(r)}`);
    if (step === until) return;
  }
}
