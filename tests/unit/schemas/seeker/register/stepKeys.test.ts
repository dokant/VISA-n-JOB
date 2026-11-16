/**
 * R-106 checklist: the wizard schema keys equal WO §7.3 per step, Step 3 / 5 sub screens split the
 * step (SC-01), every screen shows at most 7 questions (STANDARD 3.3 counting rule), and the same
 * schema module is used by the client form and the server save (STANDARD 4.6).
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { quickSchema } from "@/schemas/seeker/quick";
import { step0Schema } from "@/schemas/seeker/register/step0";
import { step1Schema } from "@/schemas/seeker/register/step1";
import { step2Schema } from "@/schemas/seeker/register/step2";
import { step3Schema, step3aSchema, step3bSchema } from "@/schemas/seeker/register/step3";
import { experienceSchema, step4Schema } from "@/schemas/seeker/register/step4";
import { step5Schema, step5bSchema } from "@/schemas/seeker/register/step5";
import { step6Schema } from "@/schemas/seeker/register/step6";
import { step7Schema } from "@/schemas/seeker/register/step7";

/** WO §7.3 문항 키 (the list lives only in this test — PLAN P1c-2). */
const WO_7_3 = {
  step0: ["locale", "phone", "referralCode"],
  step1: [
    "legalName",
    "nationality",
    "sido",
    "sigungu",
    "messengerType",
    "messengerId",
    "email",
    "birthYear",
    "gender",
  ],
  step2: [
    "visaCode",
    "visaSubType",
    "stayExpiry",
    "hasArc",
    "entryYear",
    "pendingApplication",
    "visaConfirm",
  ],
  step3: [
    "educationLevel",
    "major",
    "schoolName",
    "graduationDate",
    "topikLevel",
    "kiipStage",
    "koreanSpeaking",
    "otherLanguages",
  ],
  step4: ["experiences", "skills", "licenses"],
  experience: ["country", "industryCode", "role", "months", "employerName"],
  step5: [
    "jobSearchStatus",
    "availableFrom",
    "desiredIndustries",
    "desiredRegions",
    "needDormitory",
    "shiftOk",
    "desiredPayMin",
    "groupApply",
    "groupFriendCode",
  ],
  step6: ["nextVisaGoal", "wantsConsult", "consultTime"],
  // Step 7 consent types PRIVACY_REQUIRED / BLIND_PROFILE / MARKETING / NOTICE as camelCase fields
  step7: ["privacyRequired", "blindProfile", "marketing", "notice"],
  // WO §7.2 간편 등록 ① 언어 ② 현재 비자 ③ 거주 시·도 ④ 휴대폰(OTP) ⑤ 필수 동의
  quick: ["locale", "visaCode", "sido", "phone", "privacyRequired", "blindProfile", "notice"],
} as const;

/** OTP code field that belongs to the phone question (WO "휴대폰 번호 + OTP 인증"). */
const OTP_FIELD = "code";

const keys = (shape: object) => Object.keys(shape).sort();
const without = (list: string[], drop: string) => list.filter((k) => k !== drop);
const sorted = (list: readonly string[]) => [...list].sort();

describe("R-106 WO §7.3 key checklist", () => {
  it("R-106: Step 0 ~ 7 schema keys equal WO §7.3", () => {
    expect(without(keys(step0Schema.shape), OTP_FIELD)).toEqual(sorted(WO_7_3.step0));
    expect(keys(step1Schema.shape)).toEqual(sorted(WO_7_3.step1));
    expect(keys(step2Schema.shape)).toEqual(sorted(WO_7_3.step2));
    expect(keys(step3Schema.shape)).toEqual(sorted(WO_7_3.step3));
    expect(keys(step4Schema.shape)).toEqual(sorted(WO_7_3.step4));
    expect(keys(experienceSchema.shape)).toEqual(sorted(WO_7_3.experience));
    expect(keys(step5Schema.shape)).toEqual(sorted(WO_7_3.step5));
    expect(keys(step6Schema.innerType().shape)).toEqual(sorted(WO_7_3.step6));
    expect(keys(step7Schema.shape)).toEqual(sorted(WO_7_3.step7));
    expect(without(keys(quickSchema.shape), OTP_FIELD)).toEqual(sorted(WO_7_3.quick));
  });

  it("SC-01: Step 3 and 5 are split into two sub screens that together cover the step", () => {
    const s3 = [...keys(step3aSchema.shape), ...keys(step3bSchema.shape)].sort();
    expect(s3).toEqual(sorted(WO_7_3.step3));
    const s5a = ["jobSearchStatus", "availableFrom", "desiredIndustries", "desiredRegions"];
    const s5 = [...s5a, ...keys(step5bSchema.shape)].sort();
    expect(s5).toEqual(sorted(WO_7_3.step5));
  });

  it("STANDARD 3.3: at most 7 questions per screen (sido/sigungu and messenger type/id = 1)", () => {
    const pairs = [
      ["sido", "sigungu"],
      ["messengerType", "messengerId"],
    ];
    const count = (fields: readonly string[]) =>
      fields.length - pairs.filter(([a, b]) => fields.includes(a) && fields.includes(b)).length;
    const screens: Record<string, readonly string[]> = {
      step0: WO_7_3.step0,
      step1: WO_7_3.step1,
      step2: WO_7_3.step2,
      step3a: keys(step3aSchema.shape),
      step3b: keys(step3bSchema.shape),
      step4: WO_7_3.step4,
      step5a: ["jobSearchStatus", "availableFrom", "desiredIndustries", "desiredRegions"],
      step5b: keys(step5bSchema.shape),
      step6: WO_7_3.step6,
      step7: WO_7_3.step7,
      quick: WO_7_3.quick,
    };
    for (const [screen, fields] of Object.entries(screens)) {
      expect(count(fields), screen).toBeLessThanOrEqual(7);
    }
  });

  it("BR-13: no residence-card or passport number field in any registration schema", () => {
    const all = [
      step0Schema,
      step1Schema,
      step2Schema,
      step3Schema,
      step4Schema,
      step5Schema,
      step7Schema,
      quickSchema,
    ].flatMap((s) => Object.keys(s.shape));
    for (const k of all) expect(k).not.toMatch(/passport|arcNo|alienReg|residentNo/i);
  });

  it("STANDARD 4.6: the client forms and the server save import the same schema modules", () => {
    const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");
    const server = read("src/lib/seeker/saveStep.ts");
    const clientA = read("src/components/seeker/wizard-steps-a.tsx");
    const clientB = read("src/components/seeker/wizard-steps-b.tsx");
    for (const step of ["step1", "step2", "step3"]) {
      const mod = `@/schemas/seeker/register/${step}`;
      expect(server).toContain(mod);
      expect(clientA).toContain(mod);
    }
    for (const step of ["step4", "step5", "step6", "step7"]) {
      const mod = `@/schemas/seeker/register/${step}`;
      expect(server).toContain(mod);
      expect(clientB).toContain(mod);
    }
    expect(read("src/server/actions/seeker/register.ts")).toContain("@/schemas/seeker/quick");
    expect(read("src/components/seeker/quick-register-form.tsx")).toContain(
      "@/schemas/seeker/quick",
    );
  });
});
