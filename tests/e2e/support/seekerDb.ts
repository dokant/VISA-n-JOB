/**
 * E2E fixtures for P1c seeker registration (R-105 ~ R-113): read / prepare rows in the local
 * development database that the production-build server under test uses (same as authDb.ts).
 */
import { db } from "@/lib/db";
import { isEligibleCandidate } from "@/lib/candidates/eligible";
import type { NotificationProvider } from "@/lib/notifications";
import { phoneHashOf, requestOtp } from "@/lib/otp";
import { quickSignup } from "@/lib/seeker/account";
import { saveWizardStep } from "@/lib/seeker/saveStep";

import "./authDb";

export { isEligibleCandidate };

const silent: NotificationProvider = {
  name: "e2e-silent",
  async send() {
    return { ok: true, provider: "e2e-silent", id: "0" };
  },
};

/** "YYYY-MM" `months` from now. */
export function monthFromNow(months: number): { year: string; month: string; value: string } {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + months, 1));
  const year = String(d.getUTCFullYear());
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return { year, month, value: `${year}-${month}` };
}

/**
 * Moves the phone's OTP history back in time, so a sign-in right after registration is not refused
 * by the 60-second resend interval (R-104) — in real use the seeker comes back later.
 */
export async function ageOtpChallenges(phone: string, seconds = 3_600): Promise<void> {
  const phoneHash = phoneHashOf(phone);
  const rows = await db.otpChallenge.findMany({
    where: { phoneHash },
    select: { id: true, createdAt: true },
  });
  for (const r of rows) {
    await db.otpChallenge.update({
      where: { id: r.id },
      data: { createdAt: new Date(r.createdAt.getTime() - seconds * 1000) },
    });
  }
}

export async function seekerProfileByPhone(phone: string) {
  const user = await db.user.findUnique({
    where: { phoneHash: phoneHashOf(phone) },
    select: { id: true, seeker: true },
  });
  return user?.seeker ?? null;
}

export async function staffTasksOf(seekerId: string) {
  return db.staffTask.findMany({ where: { seekerId }, select: { type: true, status: true } });
}

export async function consentsOf(phone: string) {
  const user = await db.user.findUniqueOrThrow({ where: { phoneHash: phoneHashOf(phone) } });
  return db.consent.findMany({ where: { userId: user.id } });
}

export async function referralCodeOf(phone: string): Promise<string> {
  const p = await seekerProfileByPhone(phone);
  if (!p) throw new Error("no profile");
  return p.referralCode;
}

/**
 * A seeker who finished the whole wizard with BLIND_PROFILE and was promoted to grade A by staff
 * (the admin promotion screen is P1e; the row is updated directly here).
 */
export async function createGradeASeeker(phone: string) {
  const code = "135792";
  const otp = await requestOtp({ phone, purpose: "SIGNUP", locale: "ko", code, notifier: silent });
  if (!otp.ok) throw new Error(`otp ${otp.code}`);
  const region = await db.region.findFirstOrThrow({ where: { level: "SIDO" } });
  const industry = await db.industry.findFirstOrThrow();
  const r = await quickSignup({
    input: {
      locale: "ko",
      visaCode: "F-4",
      sido: region.code,
      phone,
      code,
      privacyRequired: true,
      blindProfile: true,
      notice: true,
    },
    ip: null,
  });
  if (!r.ok) throw new Error(`quick ${r.code}`);
  const ctx = { userId: r.userId, locale: "ko" as const, ip: null, now: new Date() };
  const steps: Array<[Parameters<typeof saveWizardStep>[0], unknown]> = [
    [
      "1",
      {
        legalName: "E2E SEEKER",
        nationality: "VN",
        sido: region.code,
        sigungu: "",
        messengerType: "",
        messengerId: "",
        email: "",
        birthYear: "",
        gender: "",
      },
    ],
    [
      "2",
      {
        visaCode: "F-4",
        visaSubType: "",
        stayExpiry: monthFromNow(24).value,
        hasArc: "YES",
        entryYear: "",
        pendingApplication: "",
        visaConfirm: true,
      },
    ],
    ["3a", { educationLevel: "HIGH_SCHOOL", major: "", schoolName: "", graduationDate: "" }],
    ["3b", { topikLevel: "2", kiipStage: "0", koreanSpeaking: "2", otherLanguages: [] }],
    ["4", { experiences: [], skills: [], licenses: [] }],
    [
      "5a",
      {
        jobSearchStatus: "IMMEDIATE",
        availableFrom: "",
        desiredIndustries: [industry.code],
        desiredRegions: ["ANY"],
      },
    ],
    [
      "5b",
      {
        needDormitory: "NO",
        shiftOk: "YES",
        desiredPayMin: "",
        groupApply: "",
        groupFriendCode: "",
      },
    ],
    ["6", { nextVisaGoal: "", wantsConsult: "", consultTime: [] }],
    ["7", { privacyRequired: true, blindProfile: true, marketing: false, notice: true }],
  ];
  for (const [step, values] of steps) {
    const s = await saveWizardStep(step, values, ctx);
    if (!s.ok) throw new Error(`step ${step}: ${JSON.stringify(s)}`);
  }
  const p = await db.seekerProfile.update({
    where: { userId: r.userId },
    data: { grade: "A", verifiedVisa: true },
    select: { id: true },
  });
  await ageOtpChallenges(phone);
  return { userId: r.userId, seekerId: p.id };
}
