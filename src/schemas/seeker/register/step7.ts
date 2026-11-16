import { z } from "zod";

import { mustCheck } from "./fields";

/**
 * Wizard Step 7 동의와 완료 (WO §7.3, R-110). PRIVACY_REQUIRED and NOTICE are always required;
 * BLIND_PROFILE is required only for the JOB_MATCH track (`step7SchemaFor`). MARKETING is optional.
 */
export const step7Schema = z.object({
  privacyRequired: mustCheck("consentRequired"),
  blindProfile: z.boolean(),
  marketing: z.boolean(),
  notice: mustCheck("consentRequired"),
});
export type Step7Input = z.input<typeof step7Schema>;

export function step7SchemaFor(blindProfileRequired: boolean) {
  return step7Schema.superRefine((v, ctx) => {
    if (blindProfileRequired && !v.blindProfile) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["blindProfile"],
        message: "consentRequired",
      });
    }
  });
}
