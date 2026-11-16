import { z } from "zod";

import { DESIRED_MAX_SELECTIONS } from "@/config/limits";
import { ANY_REGION, JOB_SEARCH_STATUSES, SHIFT_OK_VALUES } from "@/lib/seeker/options";

import { choice, optionalDay, optionalYesNo, referralCodeInput, yesNo } from "./fields";

/**
 * Wizard Step 5 희망 근무 조건 (WO §7.3), two sub screens (SC-01): 5a 구직 상태·희망 업종·지역,
 * 5b 숙소·교대·급여·친구. shiftOk is the SC-10 enum with 모름 (UNKNOWN).
 */
const codes = z.array(z.string().trim().min(1).max(40));

export const step5Schema = z.object({
  jobSearchStatus: choice(JOB_SEARCH_STATUSES),
  availableFrom: optionalDay,
  desiredIndustries: codes.min(1, "required").max(DESIRED_MAX_SELECTIONS, "tooMany"),
  desiredRegions: codes.min(1, "required").max(DESIRED_MAX_SELECTIONS, "tooMany"),
  needDormitory: yesNo,
  shiftOk: choice(SHIFT_OK_VALUES),
  desiredPayMin: z
    .string()
    .refine((v) => v === "" || v === "UNKNOWN" || /^[0-9]+$/.test(v), "invalidValue"),
  groupApply: optionalYesNo,
  groupFriendCode: referralCodeInput,
});
export type Step5Input = z.input<typeof step5Schema>;

/** Statuses that need a start date (IMMEDIATE = now, NOT_SEARCHING = none). */
export const STATUSES_NEEDING_START_DATE: readonly string[] = ["WITHIN_1M", "EMPLOYED_OPEN"];

export const step5aSchema = step5Schema
  .pick({
    jobSearchStatus: true,
    availableFrom: true,
    desiredIndustries: true,
    desiredRegions: true,
  })
  .superRefine((v, ctx) => {
    if (STATUSES_NEEDING_START_DATE.includes(v.jobSearchStatus) && v.availableFrom === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["availableFrom"], message: "required" });
    }
    if (v.desiredRegions.includes(ANY_REGION) && v.desiredRegions.length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["desiredRegions"],
        message: "invalidValue",
      });
    }
  });
export type Step5aInput = z.input<typeof step5aSchema>;

export const step5bSchema = step5Schema.pick({
  needDormitory: true,
  shiftOk: true,
  desiredPayMin: true,
  groupApply: true,
  groupFriendCode: true,
});
export type Step5bInput = z.input<typeof step5bSchema>;
