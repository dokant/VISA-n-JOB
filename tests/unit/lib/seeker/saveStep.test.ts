/**
 * R-106 / R-107 wizard saves and resume point, R-109 server-side block (WO15-05), R-110 Step 7
 * consent rows (type · version · locale · agreedAt + ipHash), StaffTask creation on completion.
 */
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { consentIpHash, currentConsentVersion } from "@/lib/seeker/consent";
import { canOpenStep, resumePoint } from "@/lib/seeker/saveStep";

import { testPrisma } from "../../db/helpers";
import { answers, fillSteps, monthFromNow, save, wizardAccount } from "./seekerFixtures";

const prisma = testPrisma();
const ALL_CONSENTS = { privacyRequired: true, blindProfile: true, marketing: true, notice: true };

async function profileOf(userId: string) {
  return db.seekerProfile.findUniqueOrThrow({ where: { userId }, include: { experiences: true } });
}

describe("R-106 / R-107 step saves", () => {
  it("R-107: completedStep moves forward per screen; resume = completedStep + 1 (3b after 3a)", async () => {
    const userId = await wizardAccount();
    const a = await answers();
    expect(resumePoint(await profileOf(userId))).toEqual({ step: 1 });

    expect(await save(userId, "1", a["1"])).toEqual({ ok: true, next: { step: 2 } });
    expect(await save(userId, "2", a["2"])).toEqual({ ok: true, next: { step: 3, sub: "a" } });
    expect(await save(userId, "3a", a["3a"])).toEqual({ ok: true, next: { step: 3, sub: "b" } });
    let p = await profileOf(userId);
    expect(p.completedStep).toBe(2);
    expect(resumePoint(p)).toEqual({ step: 3, sub: "b" });

    expect(await save(userId, "3b", a["3b"])).toEqual({ ok: true, next: { step: 4 } });
    p = await profileOf(userId);
    expect(p.completedStep).toBe(3);
    expect(resumePoint(p)).toEqual({ step: 4 });
    expect(canOpenStep(p, 2)).toBe(true);
    expect(canOpenStep(p, 4)).toBe(true);
    expect(canOpenStep(p, 5)).toBe(false);

    // values kept, personal values encrypted at rest (R-107 "입력값 유지", STANDARD 4.7)
    expect(p).toMatchObject({
      legalNameEnc: "NGUYEN VAN A",
      messengerIdEnc: "nguyen.a",
      nationality: "VN",
      visaCode: "F-4",
      track: "JOB_MATCH",
      hasArc: true,
      topikLevel: 3,
      otherLanguages: ["en"],
    });
    const raw = await prisma.seekerProfile.findUniqueOrThrow({ where: { userId } });
    expect(raw.legalNameEnc).toMatch(/^v[0-9]+:/);
    expect(raw.legalNameEnc).not.toContain("NGUYEN");
  });

  it("Q-24: Step 3a 전공 분야 is an optional code; free text or an unknown code is refused", async () => {
    const userId = await wizardAccount();
    const a = await answers();
    await save(userId, "1", a["1"]);
    await save(userId, "2", a["2"]);
    expect((await profileOf(userId)).majorField).toBeNull();
    expect(await save(userId, "3a", a["3a"])).toMatchObject({ ok: true });
    expect(await profileOf(userId)).toMatchObject({
      majorField: "ENGINEERING",
      major: "Mechanical",
    });
    for (const bad of ["Mechanical engineering", "CNC", "engineering"]) {
      expect(await save(userId, "3a", { ...a["3a"], majorField: bad })).toMatchObject({
        ok: false,
        code: "VALIDATION",
      });
    }
    // not answered ("" or a missing key) is stored as null
    expect((await save(userId, "3a", { ...a["3a"], majorField: "" })).ok).toBe(true);
    expect((await profileOf(userId)).majorField).toBeNull();
    const { majorField: _omit, ...withoutKey } = a["3a"];
    void _omit;
    expect((await save(userId, "3a", { ...withoutKey })).ok).toBe(true);
    expect((await profileOf(userId)).majorField).toBeNull();
    expect((await save(userId, "3a", { ...a["3a"], majorField: "UNKNOWN" })).ok).toBe(true);
    expect((await profileOf(userId)).majorField).toBe("UNKNOWN");
  });

  it("steps cannot be skipped and invalid answers return field codes", async () => {
    const userId = await wizardAccount();
    const a = await answers();
    expect(await save(userId, "4", a["4"])).toEqual({
      ok: false,
      code: "STEP_LOCKED",
      resume: { step: 1 },
    });
    expect(await save(userId, "1", { ...a["1"], legalName: "", nationality: "XX" })).toEqual({
      ok: false,
      code: "VALIDATION",
      fieldErrors: { legalName: "required", nationality: "invalidValue" },
    });
    expect(await save(userId, "1", { ...a["1"], sido: "NOWHERE" })).toEqual({
      ok: false,
      code: "VALIDATION",
      fieldErrors: { sido: "invalidValue" },
    });
  });

  it("Step 4 replaces the experience rows; company name is encrypted", async () => {
    const userId = await wizardAccount();
    await fillSteps(userId, {}, "3b");
    const a = await answers();
    expect((await save(userId, "4", a["4"])).ok).toBe(true);
    expect((await save(userId, "4", a["4"])).ok).toBe(true);
    const p = await profileOf(userId);
    expect(p.experiences).toHaveLength(1);
    expect(p.experiences[0]).toMatchObject({
      role: "WELDING",
      months: 24,
      employerNameEnc: "ABC Co",
    });
  });

  it("D-2 needs a graduation date; within the window the track becomes JOB_MATCH", async () => {
    const userId = await wizardAccount();
    await fillSteps(userId, { visaCode: "D-2" }, "2");
    const a = await answers();
    expect(await save(userId, "3a", a["3a"])).toEqual({
      ok: false,
      code: "VALIDATION",
      fieldErrors: { graduationDate: "required" },
    });
    expect((await profileOf(userId)).track).toBe("CONSULT_ONLY");
    expect((await save(userId, "3a", { ...a["3a"], graduationDate: monthFromNow(3) })).ok).toBe(
      true,
    );
    expect((await profileOf(userId)).track).toBe("JOB_MATCH");
  });
});

describe("R-109 server-side block in the wizard (WO15-05)", () => {
  it.each(["B-1", "B-2", "C-3", "NONE", "UNKNOWN"])(
    "R-109 WO15-05: Step 2 with %s is refused and the wizard cannot go on",
    async (visaCode) => {
      const userId = await wizardAccount();
      await fillSteps(userId, {}, "1");
      const a = await answers({ visaCode });
      expect(await save(userId, "2", a["2"])).toEqual({
        ok: false,
        code: "BLOCKED",
        reason: "VISA_NOT_REGISTRABLE",
      });
      const p = await profileOf(userId);
      expect(p.completedStep).toBe(1);
      expect(p.track).toBeNull();
      expect((await save(userId, "3a", a["3a"])).ok).toBe(false);
    },
  );

  it("R-109 WO15-05: an expired stay is refused at Step 2", async () => {
    const userId = await wizardAccount();
    await fillSteps(userId, {}, "1");
    const a = await answers({ stayExpiry: monthFromNow(-1) });
    expect(await save(userId, "2", a["2"])).toEqual({
      ok: false,
      code: "BLOCKED",
      reason: "STAY_EXPIRED",
    });
  });

  it("R-109: completion re-checks on the server — expiry passed since Step 2 → refused", async () => {
    const userId = await wizardAccount();
    await fillSteps(userId, { stayExpiry: monthFromNow(1) });
    const later = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 3, 1));
    expect(await save(userId, "7", ALL_CONSENTS, later)).toEqual({
      ok: false,
      code: "BLOCKED",
      reason: "STAY_EXPIRED",
    });
    expect((await profileOf(userId)).completedStep).toBe(6);
  });
});

describe("R-110 Step 7 consents", () => {
  it("R-110: Consent rows hold type, version, locale, agreedAt and ipHash", async () => {
    const userId = await wizardAccount();
    await fillSteps(userId);
    const now = new Date();
    expect(await save(userId, "7", ALL_CONSENTS, now)).toEqual({ ok: true, next: "complete" });
    const rows = await db.consent.findMany({ where: { userId }, orderBy: { type: "asc" } });
    expect(rows.map((r) => r.type)).toEqual([
      "BLIND_PROFILE",
      "MARKETING",
      "NOTICE",
      "PRIVACY_REQUIRED",
    ]);
    for (const r of rows) {
      expect(r.version).toBe(currentConsentVersion(r.type as "NOTICE"));
      expect(r.locale).toBe("vi");
      expect(r.agreedAt.getTime()).toBe(now.getTime());
      expect(r.ipHash).toBe(consentIpHash("198.51.100.7"));
      expect(r.ipHash).not.toContain("198.51");
      expect(r.revokedAt).toBeNull();
    }
    const p = await profileOf(userId);
    expect(p).toMatchObject({ completedStep: 7, grade: "B", track: "JOB_MATCH" });
  });

  it("R-110: BLIND_PROFILE is required for JOB_MATCH only; PRIVACY / NOTICE always", async () => {
    const f4 = await wizardAccount();
    await fillSteps(f4);
    expect(await save(f4, "7", { ...ALL_CONSENTS, blindProfile: false })).toEqual({
      ok: false,
      code: "VALIDATION",
      fieldErrors: { blindProfile: "consentRequired" },
    });
    expect(await save(f4, "7", { ...ALL_CONSENTS, notice: false })).toMatchObject({
      ok: false,
      fieldErrors: { notice: "consentRequired" },
    });

    const e9 = await wizardAccount();
    await fillSteps(e9, { visaCode: "E-9" });
    expect(await save(e9, "7", { ...ALL_CONSENTS, blindProfile: false, marketing: false })).toEqual(
      { ok: true, next: "complete" },
    );
    expect(await db.consent.count({ where: { userId: e9, type: "BLIND_PROFILE" } })).toBe(0);
    expect((await profileOf(e9)).track).toBe("FUTURE_POOL");
  });

  it("completion creates the CONSULT task when Step 6 asked for a consult", async () => {
    const userId = await wizardAccount();
    await fillSteps(userId, {}, "5b");
    expect(
      (
        await save(userId, "6", {
          nextVisaGoal: "E-7-4",
          wantsConsult: "YES",
          consultTime: ["EVENING"],
        })
      ).ok,
    ).toBe(true);
    expect((await save(userId, "7", ALL_CONSENTS)).ok).toBe(true);
    const p = await profileOf(userId);
    expect(p).toMatchObject({
      nextVisaGoal: "E-7-4",
      wantsConsult: true,
      consultTime: ["EVENING"],
    });
    expect(await db.staffTask.count({ where: { seekerId: p.id, type: "CONSULT" } })).toBe(1);
    // saving again never duplicates (dedupe key)
    expect((await save(userId, "7", ALL_CONSENTS)).ok).toBe(true);
    expect(await db.staffTask.count({ where: { seekerId: p.id, type: "CONSULT" } })).toBe(1);
  });

  it("Step 6 refuses a goal that is not offered by the VisaType data", async () => {
    const userId = await wizardAccount();
    await fillSteps(userId, {}, "5b");
    expect(
      await save(userId, "6", { nextVisaGoal: "Z-1", wantsConsult: "", consultTime: [] }),
    ).toEqual({
      ok: false,
      code: "VALIDATION",
      fieldErrors: { nextVisaGoal: "invalidValue" },
    });
  });
});
