/**
 * Reference data for the seeker registration screens, read from the database so no visa code,
 * region or industry list is written in code (BR-12, STANDARD 4.9-1).
 */
import { db } from "@/lib/db";
import { getIndustries, getSidoRegions, type CodeOption } from "@/lib/referenceData";
import { classifyTrack, listVisaTypesForTrack } from "@/lib/visa-engine/classifyTrack";

export type WizardVisaOption = {
  code: string;
  nameKey: string;
  /** false → completing registration is refused and a consult is suggested (BR-08, SC-02) */
  registrable: boolean;
  /** WO §7.3 Step 3: graduation date required (D-2·D-10) */
  requiresGraduationDate: boolean;
  /** Step 2 visaSubType choices (VisaType.subTypes) */
  subTypes: string[];
  /** quick signup: BLIND_PROFILE consent required (track JOB_MATCH without school data) */
  blindRequired: boolean;
};

export type SigunguOption = { code: string; parentCode: string; nameKo: string };

/** Step 6 nextVisaGoal option: a sub type code shown with its parent visa's easy name. */
export type GoalOption = { code: string; nameKey: string };

export async function getWizardVisaOptions(now: Date = new Date()): Promise<WizardVisaOption[]> {
  const [rows, extra] = await Promise.all([
    listVisaTypesForTrack(),
    db.visaType.findMany({
      where: { active: true },
      select: { code: true, nameKey: true, subTypes: true },
    }),
  ]);
  const byCode = new Map(extra.map((e) => [e.code, e]));
  return rows.map((row) => {
    const r = classifyTrack({ visaType: row, now });
    return {
      code: row.code,
      nameKey: byCode.get(row.code)?.nameKey ?? "",
      registrable: row.registrable,
      requiresGraduationDate: row.requiresGraduationDate,
      subTypes: byCode.get(row.code)?.subTypes ?? [],
      blindRequired: r.registrable && r.track === "JOB_MATCH",
    };
  });
}

export async function getSigunguOptions(): Promise<SigunguOption[]> {
  const rows = await db.region.findMany({
    where: { level: "SIGUNGU" },
    orderBy: [{ parentCode: "asc" }, { sortOrder: "asc" }],
    select: { code: true, parentCode: true, nameKo: true },
  });
  return rows.map((r) => ({ code: r.code, parentCode: r.parentCode ?? "", nameKo: r.nameKo }));
}

/** VisaType rows flagged nextGoal: their sub types when they have any, else the code itself. */
export async function getGoalOptions(): Promise<GoalOption[]> {
  const rows = await db.visaType.findMany({
    where: { active: true, nextGoal: true },
    orderBy: { sortOrder: "asc" },
    select: { code: true, nameKey: true, subTypes: true },
  });
  return rows.flatMap((r) =>
    r.subTypes.length > 0
      ? r.subTypes.map((code) => ({ code, nameKey: r.nameKey }))
      : [{ code: r.code, nameKey: r.nameKey }],
  );
}

export type WizardReference = {
  visas: WizardVisaOption[];
  sido: CodeOption[];
  sigungu: SigunguOption[];
  industries: CodeOption[];
  goals: GoalOption[];
};

export async function getWizardReference(): Promise<WizardReference> {
  const [visas, sido, sigungu, industries, goals] = await Promise.all([
    getWizardVisaOptions(),
    getSidoRegions(),
    getSigunguOptions(),
    getIndustries(),
    getGoalOptions(),
  ]);
  return { visas, sido, sigungu, industries, goals };
}
