import { z } from "zod";

import { EXPERIENCE_MAX_MONTHS, EXPERIENCE_MAX_ROWS } from "@/config/limits";
import { COUNTRY_CODES, JOB_ROLES, LICENSES, SKILLS } from "@/lib/seeker/options";

import { choice, codeField, multiChoice, optionalText } from "./fields";

/**
 * Wizard Step 4 경력과 기술 (WO §7.3). Employers later see industry · role · months only (WO §7.5);
 * the company name is internal (`employerNameEnc`).
 */
export const experienceSchema = z.object({
  country: choice(COUNTRY_CODES),
  industryCode: codeField,
  role: choice(JOB_ROLES),
  months: z
    .string()
    .min(1, "required")
    .refine((v) => /^[0-9]+$/.test(v), "invalidValue")
    .refine((v) => Number(v) >= 1 && Number(v) <= EXPERIENCE_MAX_MONTHS, "invalidValue"),
  employerName: optionalText(100),
});
export type ExperienceInput = z.input<typeof experienceSchema>;

export const step4Schema = z.object({
  experiences: z.array(experienceSchema).max(EXPERIENCE_MAX_ROWS, "tooMany"),
  skills: multiChoice(SKILLS, SKILLS.length),
  licenses: multiChoice(LICENSES, LICENSES.length),
});
export type Step4Input = z.input<typeof step4Schema>;
