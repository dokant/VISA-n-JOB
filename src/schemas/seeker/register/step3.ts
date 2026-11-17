import { z } from "zod";

import {
  EDUCATION_LEVELS,
  KIIP_STAGES,
  KOREAN_SPEAKING_LEVELS,
  LANGUAGE_CODES,
  MAJOR_FIELDS,
  TOPIK_LEVELS,
} from "@/lib/seeker/options";

import { choice, multiChoice, optionalChoice, optionalMonth, optionalText } from "./fields";

/**
 * Wizard Step 3 학력과 언어 (WO §7.3), shown on two sub screens (SC-01): 3a 학력, 3b 언어.
 * graduationDate is required for visas whose VisaType row says so (D-2·D-10): `step3aSchemaFor`.
 * majorField (Q-24) is an optional code from MAJOR_FIELDS — the value employers see; the free-text
 * major is staff-only (BR-14).
 */
export const step3Schema = z.object({
  educationLevel: choice(EDUCATION_LEVELS),
  // optional key too: a client that does not send it (older page) saves "not answered"
  majorField: optionalChoice(MAJOR_FIELDS).optional(),
  major: optionalText(100),
  schoolName: optionalText(100),
  graduationDate: optionalMonth,
  topikLevel: choice(TOPIK_LEVELS),
  kiipStage: choice(KIIP_STAGES),
  koreanSpeaking: choice(KOREAN_SPEAKING_LEVELS),
  otherLanguages: multiChoice(LANGUAGE_CODES, LANGUAGE_CODES.length),
});
export type Step3Input = z.input<typeof step3Schema>;

export const step3aSchema = step3Schema.pick({
  educationLevel: true,
  majorField: true,
  major: true,
  schoolName: true,
  graduationDate: true,
});
export type Step3aInput = z.input<typeof step3aSchema>;

export const step3bSchema = step3Schema.pick({
  topikLevel: true,
  kiipStage: true,
  koreanSpeaking: true,
  otherLanguages: true,
});
export type Step3bInput = z.input<typeof step3bSchema>;

/** 3a with the graduation date required when the seeker's VisaType has requiresGraduationDate. */
export function step3aSchemaFor(requiresGraduationDate: boolean) {
  return step3aSchema.superRefine((v, ctx) => {
    if (requiresGraduationDate && v.graduationDate === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["graduationDate"], message: "required" });
    }
  });
}
