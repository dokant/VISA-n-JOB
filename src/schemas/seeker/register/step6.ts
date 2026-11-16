import { z } from "zod";

import { CONSULT_TIMES } from "@/lib/seeker/options";

import { multiChoice, optionalCode, optionalYesNo } from "./fields";

/** Wizard Step 6 비자 목표 (WO §7.3). nextVisaGoal options come from VisaType rows (nextGoal). */
export const step6Schema = z
  .object({
    nextVisaGoal: optionalCode,
    wantsConsult: optionalYesNo,
    consultTime: multiChoice(CONSULT_TIMES, CONSULT_TIMES.length),
  })
  .superRefine((v, ctx) => {
    if (v.wantsConsult === "YES" && v.consultTime.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["consultTime"], message: "required" });
    }
  });
export type Step6Input = z.input<typeof step6Schema>;
