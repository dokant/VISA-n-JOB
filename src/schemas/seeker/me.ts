import { z } from "zod";

import { REVOCABLE_CONSENTS } from "@/lib/seeker/options";

import { monthField } from "./register/fields";

/** /seeker/me consent revoke / give again (R-113). */
export const consentChangeSchema = z.object({
  type: z.enum(REVOCABLE_CONSENTS),
});
export type ConsentChangeInput = z.input<typeof consentChangeSchema>;

/** /seeker/me/stay (R-113, WO §6.2 체류 만료 알림 설정). */
export const staySettingsSchema = z.object({
  stayExpiry: monthField,
  stayAlertOptIn: z.boolean(),
});
export type StaySettingsInput = z.input<typeof staySettingsSchema>;
