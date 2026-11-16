import { z } from "zod";

import { COUNTRY_CODES, GENDERS, MESSENGER_TYPES } from "@/lib/seeker/options";

import {
  choice,
  codeField,
  optionalChoice,
  optionalCode,
  optionalText,
  optionalYear,
} from "./fields";

/** Wizard Step 1 기본 정보 (WO §7.3). legalName / messengerId / email are stored as `*Enc`. */
export const step1Schema = z.object({
  legalName: z.string().trim().min(1, "required").max(100, "tooLong"),
  nationality: choice(COUNTRY_CODES),
  sido: codeField,
  sigungu: optionalCode,
  messengerType: optionalChoice(MESSENGER_TYPES),
  messengerId: optionalText(100),
  email: z.union([z.literal(""), z.string().trim().max(254, "tooLong").email("invalidEmail")]),
  birthYear: optionalYear,
  gender: optionalChoice(GENDERS),
});
export type Step1Input = z.input<typeof step1Schema>;
