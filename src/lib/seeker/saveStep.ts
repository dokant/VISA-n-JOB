/**
 * Wizard step saves (R-106, R-107, R-108, R-109, R-110). Each call validates with the same zod
 * schema as the form (STANDARD 4.6), checks reference codes against the database, stores the
 * answers (personal values in `*Enc` columns — encrypted by the db extension) and moves
 * `completedStep` forward. Steps cannot be skipped: step N needs completedStep >= N - 1, and the
 * second sub screen of Step 3 / 5 (SC-01) needs the first one.
 *
 * BR-08 / R-109: Step 2 and the completion (Step 7) classify the visa from the VisaType row
 * (classifyTrack). A visa that cannot register, an expired stay or no visa refuses the save /
 * completion with `BLOCKED` and the screen guides to a consult.
 */
import type { JobSearchStatus, Prisma, SeekerProfile, ShiftOk, YesNoUnknown } from "@prisma/client";
import type { ZodType, ZodTypeDef } from "zod";

import type { Locale } from "@/i18n/locales";
import { db } from "@/lib/db";
import {
  type TrackBlockReason,
  type TrackResult,
  classifyTrack,
  loadVisaTypeForTrack,
} from "@/lib/visa-engine/classifyTrack";
import { step1Schema } from "@/schemas/seeker/register/step1";
import { step2Schema } from "@/schemas/seeker/register/step2";
import { step3aSchemaFor, step3bSchema } from "@/schemas/seeker/register/step3";
import { step4Schema } from "@/schemas/seeker/register/step4";
import { step5aSchema, step5bSchema } from "@/schemas/seeker/register/step5";
import { step6Schema } from "@/schemas/seeker/register/step6";
import { step7SchemaFor } from "@/schemas/seeker/register/step7";

import { recordConsents } from "./consent";
import {
  ANY_REGION,
  type RegistrationConsent,
  UNKNOWN,
  WIZARD_LAST_STEP,
  dayToDate,
  monthToDate,
} from "./options";
import { getGoalOptions } from "./reference";
import { createRegistrationTasks } from "./tasks";

export type StepId = "1" | "2" | "3a" | "3b" | "4" | "5a" | "5b" | "6" | "7";

export type StepSaveResult =
  | { ok: true; next: { step: number; sub?: "a" | "b" } | "complete" }
  | { ok: false; code: "NO_PROFILE" }
  | { ok: false; code: "STEP_LOCKED"; resume: { step: number; sub?: "a" | "b" } }
  | { ok: false; code: "VALIDATION"; fieldErrors: Record<string, string> }
  | { ok: false; code: "BLOCKED"; reason: TrackBlockReason };

type Ctx = { userId: string; now: Date; locale: Locale; ip: string | null };

const intOrNull = (v: string): number | null => (/^[0-9]+$/.test(v) ? Number(v) : null);
const yes = (v: string): boolean => v === "YES";
const yesNoOrNull = (v: string): boolean | null => (v === "" ? null : v === "YES");
const textOrNull = (v: string): string | null => (v.trim() === "" ? null : v.trim());

function validation(field: string, code = "invalidValue"): StepSaveResult {
  return { ok: false, code: "VALIDATION", fieldErrors: { [field]: code } };
}

function parse<T>(
  schema: ZodType<T, ZodTypeDef, unknown>,
  input: unknown,
): { ok: true; data: T } | { ok: false; result: StepSaveResult } {
  const r = schema.safeParse(input);
  if (r.success) return { ok: true, data: r.data };
  const fieldErrors: Record<string, string> = {};
  for (const issue of r.error.issues) {
    const key = issue.path.join(".");
    fieldErrors[key] ??= issue.message;
  }
  return { ok: false, result: { ok: false, code: "VALIDATION", fieldErrors } };
}

/** Where a seeker continues (R-107): the step after the last completed one. */
export function resumePoint(
  profile: Pick<SeekerProfile, "completedStep" | "educationLevel" | "jobSearchStatus">,
): {
  step: number;
  sub?: "a" | "b";
} {
  const step = Math.min(profile.completedStep + 1, WIZARD_LAST_STEP);
  if (step === 3) return { step, sub: profile.educationLevel ? "b" : "a" };
  if (step === 5) return { step, sub: profile.jobSearchStatus ? "b" : "a" };
  return { step };
}

/** Steps a seeker may open: anything up to the resume point. */
export function canOpenStep(
  profile: Pick<SeekerProfile, "completedStep" | "educationLevel" | "jobSearchStatus">,
  step: number,
  sub?: "a" | "b",
): boolean {
  if (step < 1 || step > WIZARD_LAST_STEP) return false;
  const resume = resumePoint(profile);
  if (step < resume.step) return true;
  if (step > resume.step) return false;
  return sub !== "b" || resume.sub === "b";
}

async function regionOk(code: string, level: "SIDO" | "SIGUNGU", parent?: string) {
  const row = await db.region.findUnique({
    where: { code },
    select: { level: true, parentCode: true },
  });
  return row != null && row.level === level && (parent === undefined || row.parentCode === parent);
}

async function industriesOk(codes: readonly string[]): Promise<boolean> {
  if (codes.length === 0) return true;
  const n = await db.industry.count({ where: { code: { in: [...new Set(codes)] } } });
  return n === new Set(codes).size;
}

/** Current classification of a stored profile (visa row + stay expiry + graduation month). */
export async function classifyProfile(
  profile: Pick<SeekerProfile, "visaCode" | "stayExpiry" | "graduationDate">,
  now: Date,
): Promise<TrackResult> {
  return classifyTrack({
    visaType: await loadVisaTypeForTrack(profile.visaCode),
    stayExpiry: profile.stayExpiry,
    graduationDate: profile.graduationDate,
    now,
  });
}

async function update(profileId: string, data: Prisma.SeekerProfileUpdateInput) {
  await db.seekerProfile.update({ where: { id: profileId }, data });
}

// ─── Steps ────────────────────────────────────────────────────────────────────

async function saveStep1(p: SeekerProfile, input: unknown): Promise<StepSaveResult> {
  const parsed = parse(step1Schema, input);
  if (!parsed.ok) return parsed.result;
  const v = parsed.data;
  if (!(await regionOk(v.sido, "SIDO"))) return validation("sido");
  if (v.sigungu && !(await regionOk(v.sigungu, "SIGUNGU", v.sido))) return validation("sigungu");
  const birthYear = intOrNull(v.birthYear);
  await update(p.id, {
    legalNameEnc: v.legalName,
    nationality: v.nationality,
    sido: v.sido,
    sigungu: textOrNull(v.sigungu),
    messengerType: textOrNull(v.messengerType),
    messengerIdEnc:
      v.messengerType && v.messengerType !== "NONE" ? textOrNull(v.messengerId) : null,
    emailEnc: textOrNull(v.email),
    birthYear,
    gender: textOrNull(v.gender),
    completedStep: Math.max(p.completedStep, 1),
  });
  return { ok: true, next: { step: 2 } };
}

async function saveStep2(p: SeekerProfile, input: unknown, ctx: Ctx): Promise<StepSaveResult> {
  const parsed = parse(step2Schema, input);
  if (!parsed.ok) return parsed.result;
  const v = parsed.data;
  const visa = await db.visaType.findFirst({
    where: { code: v.visaCode, active: true },
    select: { subTypes: true },
  });
  if (!visa) return validation("visaCode");
  if (v.visaSubType && v.visaSubType !== UNKNOWN && !visa.subTypes.includes(v.visaSubType)) {
    return validation("visaSubType");
  }
  const stayExpiry = monthToDate(v.stayExpiry);
  const fields: Prisma.SeekerProfileUpdateInput = {
    visaCode: v.visaCode,
    visaSubType: textOrNull(v.visaSubType),
    stayExpiry,
    hasArc: yes(v.hasArc),
    entryYear: intOrNull(v.entryYear),
    pendingApplication: v.pendingApplication === "" ? null : (v.pendingApplication as YesNoUnknown),
    visaConfirmedAt: ctx.now,
  };
  const track = classifyTrack({
    visaType: await loadVisaTypeForTrack(v.visaCode),
    stayExpiry,
    graduationDate: p.graduationDate,
    now: ctx.now,
  });
  if (!track.registrable) {
    // Keep the answers for the consult, but the wizard cannot go on with this visa (BR-08).
    await update(p.id, {
      ...fields,
      track: null,
      needsVisaReview: false,
      completedStep: Math.min(p.completedStep, 1),
    });
    return { ok: false, code: "BLOCKED", reason: track.reason };
  }
  await update(p.id, {
    ...fields,
    track: track.track,
    needsVisaReview: track.needsVisaReview,
    completedStep: Math.max(p.completedStep, 2),
  });
  return { ok: true, next: { step: 3, sub: "a" } };
}

async function saveStep3a(p: SeekerProfile, input: unknown, ctx: Ctx): Promise<StepSaveResult> {
  const visa = await loadVisaTypeForTrack(p.visaCode);
  const parsed = parse(step3aSchemaFor(visa?.requiresGraduationDate ?? false), input);
  if (!parsed.ok) return parsed.result;
  const v = parsed.data;
  const graduationDate = v.graduationDate ? monthToDate(v.graduationDate) : null;
  // The D-2 graduation window can change the track (WO §7.4).
  const track = classifyTrack({
    visaType: visa,
    stayExpiry: p.stayExpiry,
    graduationDate,
    now: ctx.now,
  });
  if (!track.registrable) return { ok: false, code: "BLOCKED", reason: track.reason };
  await update(p.id, {
    educationLevel: v.educationLevel,
    major: textOrNull(v.major),
    schoolNameEnc: textOrNull(v.schoolName),
    graduationDate,
    track: track.track,
    needsVisaReview: track.needsVisaReview,
  });
  return { ok: true, next: { step: 3, sub: "b" } };
}

async function saveStep3b(p: SeekerProfile, input: unknown): Promise<StepSaveResult> {
  if (!p.educationLevel) return { ok: false, code: "STEP_LOCKED", resume: { step: 3, sub: "a" } };
  const parsed = parse(step3bSchema, input);
  if (!parsed.ok) return parsed.result;
  const v = parsed.data;
  await update(p.id, {
    topikLevel: Number(v.topikLevel),
    kiipStage: Number(v.kiipStage),
    koreanSpeaking: Number(v.koreanSpeaking),
    otherLanguages: v.otherLanguages,
    completedStep: Math.max(p.completedStep, 3),
  });
  return { ok: true, next: { step: 4 } };
}

async function saveStep4(p: SeekerProfile, input: unknown): Promise<StepSaveResult> {
  const parsed = parse(step4Schema, input);
  if (!parsed.ok) return parsed.result;
  const v = parsed.data;
  if (!(await industriesOk(v.experiences.map((e) => e.industryCode)))) {
    return validation("experiences");
  }
  await db.$transaction(async (tx) => {
    await tx.workExperience.deleteMany({ where: { seekerId: p.id } });
    await tx.seekerProfile.update({
      where: { id: p.id },
      data: {
        skills: v.skills,
        licenses: v.licenses,
        completedStep: Math.max(p.completedStep, 4),
        experiences: {
          create: v.experiences.map((e) => ({
            country: e.country,
            industryCode: e.industryCode,
            role: e.role,
            months: Number(e.months),
            employerNameEnc: textOrNull(e.employerName),
          })),
        },
      },
    });
  });
  return { ok: true, next: { step: 5, sub: "a" } };
}

async function saveStep5a(p: SeekerProfile, input: unknown): Promise<StepSaveResult> {
  const parsed = parse(step5aSchema, input);
  if (!parsed.ok) return parsed.result;
  const v = parsed.data;
  if (!(await industriesOk(v.desiredIndustries))) return validation("desiredIndustries");
  const regions = v.desiredRegions.filter((r) => r !== ANY_REGION);
  if (regions.length > 0) {
    const n = await db.region.count({ where: { code: { in: regions }, level: "SIDO" } });
    if (n !== new Set(regions).size) return validation("desiredRegions");
  }
  await update(p.id, {
    jobSearchStatus: v.jobSearchStatus as JobSearchStatus,
    availableFrom: v.availableFrom ? dayToDate(v.availableFrom) : null,
    desiredIndustries: v.desiredIndustries,
    desiredRegions: v.desiredRegions,
  });
  return { ok: true, next: { step: 5, sub: "b" } };
}

async function saveStep5b(p: SeekerProfile, input: unknown): Promise<StepSaveResult> {
  if (!p.jobSearchStatus) return { ok: false, code: "STEP_LOCKED", resume: { step: 5, sub: "a" } };
  const parsed = parse(step5bSchema, input);
  if (!parsed.ok) return parsed.result;
  const v = parsed.data;
  const groupApply = v.groupApply === "YES";
  await update(p.id, {
    needDormitory: yes(v.needDormitory),
    shiftOk: v.shiftOk as ShiftOk,
    desiredPayMin: intOrNull(v.desiredPayMin),
    groupApply,
    groupFriendCode: groupApply ? textOrNull(v.groupFriendCode) : null,
    completedStep: Math.max(p.completedStep, 5),
  });
  return { ok: true, next: { step: 6 } };
}

async function saveStep6(p: SeekerProfile, input: unknown): Promise<StepSaveResult> {
  const parsed = parse(step6Schema, input);
  if (!parsed.ok) return parsed.result;
  const v = parsed.data;
  if (v.nextVisaGoal && v.nextVisaGoal !== UNKNOWN) {
    const goals = await getGoalOptions();
    if (!goals.some((g) => g.code === v.nextVisaGoal)) return validation("nextVisaGoal");
  }
  const wantsConsult = yesNoOrNull(v.wantsConsult) === true;
  await update(p.id, {
    nextVisaGoal: textOrNull(v.nextVisaGoal),
    wantsConsult,
    consultTime: wantsConsult ? v.consultTime : [],
    completedStep: Math.max(p.completedStep, 6),
  });
  return { ok: true, next: { step: 7 } };
}

/** Step 7: consents + completion (R-110). Grade stays B until staff verification (WO §7.6). */
async function completeRegistration(
  p: SeekerProfile,
  input: unknown,
  ctx: Ctx,
): Promise<StepSaveResult> {
  const track = await classifyProfile(p, ctx.now);
  if (!track.registrable) return { ok: false, code: "BLOCKED", reason: track.reason };
  const parsed = parse(step7SchemaFor(track.track === "JOB_MATCH"), input);
  if (!parsed.ok) return parsed.result;
  const v = parsed.data;
  const types: RegistrationConsent[] = ["PRIVACY_REQUIRED", "NOTICE"];
  if (v.blindProfile) types.push("BLIND_PROFILE");
  if (v.marketing) types.push("MARKETING");

  await db.$transaction(async (tx) => {
    await recordConsents(tx, {
      userId: ctx.userId,
      types,
      locale: ctx.locale,
      ip: ctx.ip,
      now: ctx.now,
    });
    await tx.seekerProfile.update({
      where: { id: p.id },
      data: {
        track: track.track,
        needsVisaReview: track.needsVisaReview,
        completedStep: WIZARD_LAST_STEP,
        lastActiveConfirmedAt: ctx.now,
      },
    });
    await createRegistrationTasks(tx, {
      seekerId: p.id,
      autoConsult: track.autoConsult,
      needsVisaReview: track.needsVisaReview,
      wantsConsult: p.wantsConsult,
      now: ctx.now,
    });
  });
  return { ok: true, next: "complete" };
}

const REQUIRED_DONE: Record<StepId, number> = {
  "1": 0,
  "2": 1,
  "3a": 2,
  "3b": 2,
  "4": 3,
  "5a": 4,
  "5b": 4,
  "6": 5,
  "7": 6,
};

export async function saveWizardStep(
  step: StepId,
  input: unknown,
  ctx: Ctx,
): Promise<StepSaveResult> {
  const profile = await db.seekerProfile.findUnique({ where: { userId: ctx.userId } });
  if (!profile) return { ok: false, code: "NO_PROFILE" };
  if (profile.completedStep < REQUIRED_DONE[step]) {
    return { ok: false, code: "STEP_LOCKED", resume: resumePoint(profile) };
  }
  switch (step) {
    case "1":
      return saveStep1(profile, input);
    case "2":
      return saveStep2(profile, input, ctx);
    case "3a":
      return saveStep3a(profile, input, ctx);
    case "3b":
      return saveStep3b(profile, input);
    case "4":
      return saveStep4(profile, input);
    case "5a":
      return saveStep5a(profile, input);
    case "5b":
      return saveStep5b(profile, input);
    case "6":
      return saveStep6(profile, input);
    case "7":
      return completeRegistration(profile, input, ctx);
  }
}
