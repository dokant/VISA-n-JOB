import type { CodeOption } from "@/lib/referenceData";
import type { GoalOption, SigunguOption, WizardVisaOption } from "@/lib/seeker/reference";

/** Reference data handed from the wizard page (server) to the step forms (client). */
export type ClientReference = {
  visas: WizardVisaOption[];
  sido: CodeOption[];
  sigungu: SigunguOption[];
  industries: CodeOption[];
  goals: GoalOption[];
  /** current year on the server (option ranges) */
  nowYear: number;
  /** the seeker's visa needs a graduation date (Step 3a, D-2·D-10) */
  requiresGraduationDate: boolean;
  /** the seeker's track is JOB_MATCH → BLIND_PROFILE consent required (Step 7) */
  blindProfileRequired: boolean;
};
