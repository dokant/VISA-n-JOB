/**
 * R-105 간편 등록, R-109 등록 불가 비자 차단 (WO15-05), R-111 ?ref·?src 저장 + 고유 referralCode.
 */
import { describe, expect, it } from "vitest";

import { REFERRAL_CODE_LENGTH } from "@/config/limits";
import { db } from "@/lib/db";
import { phoneHashOf } from "@/lib/otp";
import { quickSignup, startWizardAccount } from "@/lib/seeker/account";

import { testPrisma } from "../../db/helpers";
import { randomPhone } from "../authFixtures";
import { OTP, quick, signupOtp, sido } from "./seekerFixtures";

const prisma = testPrisma();

async function profileOf(userId: string) {
  return db.seekerProfile.findUniqueOrThrow({ where: { userId } });
}

describe("R-105 간편 등록", () => {
  it("R-105: isQuickSignup, grade B, track from VisaType, 프로필 완성 notice task sent", async () => {
    const r = await quick({ visaCode: "F-4", locale: "vi" });
    expect(r).toMatchObject({ ok: true, created: true });
    if (!r.ok) return;
    const p = await profileOf(r.userId);
    expect(p).toMatchObject({
      isQuickSignup: true,
      grade: "B",
      track: "JOB_MATCH",
      visaCode: "F-4",
      completedStep: 0,
    });
    const tasks = await db.staffTask.findMany({ where: { seekerId: p.id } });
    const notice = tasks.find((t) => t.type === "PROFILE_COMPLETION_NOTICE");
    expect(notice).toBeDefined();
    expect(notice?.payload).toMatchObject({
      templateKey: "common.profileCompletion.sms",
      locale: "vi",
    });
    // console adapter accepted it → the job is closed
    expect(notice?.status).toBe("DONE");
    const user = await db.user.findUniqueOrThrow({ where: { id: r.userId } });
    expect(user).toMatchObject({ role: "SEEKER", locale: "vi" });
    // phone stored encrypted + HMAC only
    const raw = await prisma.user.findUniqueOrThrow({ where: { id: r.userId } });
    expect(raw.phoneEnc).toMatch(/^v[0-9]+:/);
    expect(raw.phoneHash).toBe(phoneHashOf(user.phoneEnc ?? ""));
  });

  it("WO §7.4: D-10 creates a CONSULT task, E-7 a VISA_REVIEW task + needsVisaReview", async () => {
    const d10 = await quick({ visaCode: "D-10" });
    const e7 = await quick({ visaCode: "E-7" });
    if (!d10.ok || !e7.ok) throw new Error("signup failed");
    const p10 = await profileOf(d10.userId);
    const p7 = await profileOf(e7.userId);
    expect(await db.staffTask.count({ where: { seekerId: p10.id, type: "CONSULT" } })).toBe(1);
    expect(p7.needsVisaReview).toBe(true);
    expect(await db.staffTask.count({ where: { seekerId: p7.id, type: "VISA_REVIEW" } })).toBe(1);
  });

  it("R-110: BLIND_PROFILE is required only when the track is JOB_MATCH", async () => {
    expect(await quick({ visaCode: "F-4", blindProfile: false })).toEqual({
      ok: false,
      code: "CONSENT_REQUIRED",
    });
    const e9 = await quick({ visaCode: "E-9", blindProfile: false });
    expect(e9).toMatchObject({ ok: true, created: true });
    if (!e9.ok) return;
    expect((await profileOf(e9.userId)).track).toBe("FUTURE_POOL");
  });

  it("a wrong OTP creates nothing; the same phone again signs the existing seeker in", async () => {
    const phone = randomPhone();
    await signupOtp(phone);
    const bad = await quickSignup({
      input: {
        locale: "ko",
        visaCode: "F-4",
        sido: await sido(),
        phone,
        code: "000000",
        privacyRequired: true,
        blindProfile: true,
        notice: true,
      },
      ip: null,
    });
    expect(bad).toMatchObject({ ok: false, code: "OTP_INVALID" });
    expect(await db.user.count({ where: { phoneHash: phoneHashOf(phone) } })).toBe(0);

    const later = (sec: number) => new Date(Date.now() + sec * 1000);
    const first = await quick({ phone }, { now: later(120) });
    const again = await quick({ phone }, { now: later(240) });
    expect(first).toMatchObject({ ok: true, created: true });
    expect(again).toMatchObject({ ok: true, created: false });
    if (first.ok && again.ok) expect(again.userId).toBe(first.userId);
  });
});

describe("R-109 등록 불가 비자 (BR-08)", () => {
  it.each(["B-1", "B-2", "C-3", "NONE", "UNKNOWN", "OTHER"])(
    "R-109 WO15-05: quick signup with %s is refused before anything is stored",
    async (visaCode) => {
      const phone = randomPhone();
      const r = await quick({ visaCode, phone });
      expect(r).toEqual({ ok: false, code: "BLOCKED", reason: "VISA_NOT_REGISTRABLE" });
      expect(await db.user.count({ where: { phoneHash: phoneHashOf(phone) } })).toBe(0);
    },
  );
});

describe("R-111 ?ref · ?src + referral code", () => {
  it("R-111: referredByCode / sourceChannel are stored from the entry parameters", async () => {
    const referrer = await quick();
    if (!referrer.ok) throw new Error("referrer failed");
    const code = (await profileOf(referrer.userId)).referralCode;
    expect(code).toMatch(new RegExp(`^[A-Z0-9]{${REFERRAL_CODE_LENGTH}}$`));

    const r = await quick({}, { entry: { ref: code.toLowerCase(), src: "QR_BUSAN_FAIR" } });
    if (!r.ok) throw new Error("signup failed");
    const p = await profileOf(r.userId);
    expect(p.referredByCode).toBe(code);
    expect(p.sourceChannel).toBe("QR_BUSAN_FAIR");
    expect(p.referralCode).not.toBe(code);
  });

  it("an unknown ?ref is ignored, a bad ?src is dropped; a typed unknown code is refused", async () => {
    const r = await quick({}, { entry: { ref: "ZZZZZZZZ", src: "bad src!" } });
    if (!r.ok) throw new Error("signup failed");
    const p = await profileOf(r.userId);
    expect(p.referredByCode).toBeNull();
    expect(p.sourceChannel).toBeNull();

    const phone = randomPhone();
    await signupOtp(phone);
    expect(
      await startWizardAccount({ phone, code: OTP, locale: "ko", referralCode: "ZZZZZZZZ" }),
    ).toEqual({ ok: false, code: "INVALID_REFERRAL_CODE" });
  });

  it("R-111: wizard Step 0 stores the typed referral code and the source channel", async () => {
    const referrer = await quick();
    if (!referrer.ok) throw new Error("referrer failed");
    const code = (await profileOf(referrer.userId)).referralCode;
    const phone = randomPhone();
    await signupOtp(phone);
    const r = await startWizardAccount({
      phone,
      code: OTP,
      locale: "uz",
      referralCode: code,
      entry: { src: "FB_UZ" },
    });
    if (!r.ok) throw new Error("start failed");
    const p = await profileOf(r.userId);
    expect(p).toMatchObject({
      referredByCode: code,
      sourceChannel: "FB_UZ",
      isQuickSignup: false,
      completedStep: 0,
      visaCode: null,
      track: null,
    });
  });

  it("referral codes are unique across many seekers", async () => {
    const codes = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const r = await quick();
      if (r.ok) codes.add((await profileOf(r.userId)).referralCode);
    }
    expect(codes.size).toBe(5);
  });
});
