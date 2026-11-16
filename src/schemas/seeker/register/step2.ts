import { z } from "zod";

import {
  codeField,
  monthField,
  mustCheck,
  optionalCode,
  optionalYear,
  optionalYesNo,
  yesNo,
} from "./fields";

/**
 * Wizard Step 2 체류자격 (WO §7.3). hasArc is yes / no only — the 외국인등록번호 itself is never
 * collected (BR-13). Whether the visa can complete registration is decided on the server from the
 * VisaType row (classifyTrack, BR-08).
 */
export const step2Schema = z.object({
  visaCode: codeField,
  visaSubType: optionalCode,
  stayExpiry: monthField,
  hasArc: yesNo,
  entryYear: optionalYear,
  pendingApplication: optionalYesNo,
  visaConfirm: mustCheck("mustConfirm"),
});
export type Step2Input = z.input<typeof step2Schema>;
