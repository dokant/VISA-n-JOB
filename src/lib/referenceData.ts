/**
 * Reference data for public forms (VisaType, Region 시·도, Industry). Read from the database so no
 * visa code or region list is written in code (BR-12, STANDARD 4.9-1). Display names come from the
 * row's `nameKey` (STANDARD 3.6).
 */
import { db } from "@/lib/db";

export type VisaOption = { code: string; nameKey: string; registrable: boolean };
export type CodeOption = { code: string; nameKey: string };

/** Active visa types in operator order. */
export async function getVisaTypes(): Promise<VisaOption[]> {
  return db.visaType.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: { code: true, nameKey: true, registrable: true },
  });
}

/** 시·도 (17) in operator order. */
export async function getSidoRegions(): Promise<CodeOption[]> {
  const rows = await db.region.findMany({
    where: { level: "SIDO" },
    orderBy: { sortOrder: "asc" },
    select: { code: true, nameKey: true },
  });
  return rows.map((r) => ({
    code: r.code,
    nameKey: r.nameKey ?? `common.region.${r.code.toLowerCase()}`,
  }));
}

/** KSIC sections in operator order. */
export async function getIndustries(): Promise<CodeOption[]> {
  return db.industry.findMany({
    orderBy: { sortOrder: "asc" },
    select: { code: true, nameKey: true },
  });
}
