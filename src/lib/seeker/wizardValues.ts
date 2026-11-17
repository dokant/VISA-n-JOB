/**
 * Stored answers → form values, so a returning seeker sees what was saved (R-107 "입력값 유지").
 * Only the seeker's own data, only for the seeker's own session (decrypted by the db extension).
 */
import type { SeekerProfile, WorkExperience } from "@prisma/client";

import type { Step1Input } from "@/schemas/seeker/register/step1";
import type { Step2Input } from "@/schemas/seeker/register/step2";
import type { Step3aInput, Step3bInput } from "@/schemas/seeker/register/step3";
import type { Step4Input } from "@/schemas/seeker/register/step4";
import type { Step5aInput, Step5bInput } from "@/schemas/seeker/register/step5";
import type { Step6Input } from "@/schemas/seeker/register/step6";
import type { Step7Input } from "@/schemas/seeker/register/step7";

import { dateToDay, dateToMonth } from "./options";

export type WizardValues = {
  "1": Step1Input;
  "2": Step2Input;
  "3a": Step3aInput;
  "3b": Step3bInput;
  "4": Step4Input;
  "5a": Step5aInput;
  "5b": Step5bInput;
  "6": Step6Input;
  "7": Step7Input;
};

const str = (v: string | null | undefined) => v ?? "";
const num = (v: number | null | undefined) => (v == null ? "" : String(v));
const yn = (v: boolean | null | undefined) => (v == null ? "" : v ? "YES" : "NO");

function languages(value: unknown): Step3bInput["otherLanguages"] {
  return Array.isArray(value)
    ? (value.filter((v) => typeof v === "string") as Step3bInput["otherLanguages"])
    : [];
}

export function wizardValues(
  p: SeekerProfile & { experiences: WorkExperience[] },
  activeConsentTypes: readonly string[],
): WizardValues {
  return {
    "1": {
      legalName: str(p.legalNameEnc),
      nationality: str(p.nationality),
      sido: str(p.sido),
      sigungu: str(p.sigungu),
      messengerType: str(p.messengerType) as Step1Input["messengerType"],
      messengerId: str(p.messengerIdEnc),
      email: str(p.emailEnc),
      birthYear: num(p.birthYear),
      gender: str(p.gender) as Step1Input["gender"],
    },
    "2": {
      visaCode: str(p.visaCode),
      visaSubType: str(p.visaSubType),
      stayExpiry: dateToMonth(p.stayExpiry),
      hasArc: yn(p.hasArc),
      entryYear: num(p.entryYear),
      pendingApplication: p.pendingApplication ?? "",
      visaConfirm: p.visaConfirmedAt != null,
    },
    "3a": {
      educationLevel: str(p.educationLevel),
      majorField: str(p.majorField) as Step3aInput["majorField"],
      major: str(p.major),
      schoolName: str(p.schoolNameEnc),
      graduationDate: dateToMonth(p.graduationDate),
    },
    "3b": {
      topikLevel: num(p.topikLevel),
      kiipStage: num(p.kiipStage),
      koreanSpeaking: num(p.koreanSpeaking),
      otherLanguages: languages(p.otherLanguages),
    },
    "4": {
      experiences: p.experiences.map((e) => ({
        country: e.country,
        industryCode: e.industryCode,
        role: e.role,
        months: String(e.months),
        employerName: str(e.employerNameEnc),
      })),
      skills: p.skills as Step4Input["skills"],
      licenses: p.licenses as Step4Input["licenses"],
    },
    "5a": {
      jobSearchStatus: str(p.jobSearchStatus),
      availableFrom: dateToDay(p.availableFrom),
      desiredIndustries: p.desiredIndustries,
      desiredRegions: p.desiredRegions,
    },
    "5b": {
      needDormitory: yn(p.needDormitory),
      shiftOk: str(p.shiftOk),
      desiredPayMin: num(p.desiredPayMin),
      groupApply: p.completedStep >= 5 ? yn(p.groupApply) : "",
      groupFriendCode: str(p.groupFriendCode),
    },
    "6": {
      nextVisaGoal: str(p.nextVisaGoal),
      wantsConsult: p.completedStep >= 6 ? yn(p.wantsConsult) : "",
      consultTime: p.consultTime as Step6Input["consultTime"],
    },
    "7": {
      privacyRequired: activeConsentTypes.includes("PRIVACY_REQUIRED"),
      blindProfile: activeConsentTypes.includes("BLIND_PROFILE"),
      marketing: activeConsentTypes.includes("MARKETING"),
      notice: activeConsentTypes.includes("NOTICE"),
    },
  };
}
