/**
 * STANDARD 3.6 (v2.2): every `nameKey` of the seeded reference data (VisaType, Region 시·도, Industry)
 * and every seeded VisaRule `messageKey` exists in all 6 messages files (from P1a, where the keys are
 * first shown on screen).
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { flattenKeys, LOCALES } from "../../../scripts/lib/i18n";
import { testPrisma } from "./helpers";

const prisma = testPrisma();
afterAll(() => prisma.$disconnect());

function keysOf(locale: string): Set<string> {
  const file = path.join(process.cwd(), "messages", `${locale}.json`);
  return new Set(flattenKeys(JSON.parse(readFileSync(file, "utf8"))).keys());
}

describe("seed nameKey / messageKey exist in every locale (STANDARD 3.6)", () => {
  it("VisaType, Region (SIDO), Industry, VisaRule keys", async () => {
    const [visaTypes, regions, industries, rules] = await Promise.all([
      prisma.visaType.findMany({ select: { nameKey: true } }),
      prisma.region.findMany({ where: { level: "SIDO" }, select: { nameKey: true } }),
      prisma.industry.findMany({ select: { nameKey: true } }),
      prisma.visaRule.findMany({ where: { isSample: true }, select: { messageKey: true } }),
    ]);
    const required = [
      ...visaTypes.map((v) => v.nameKey),
      ...regions.map((r) => r.nameKey ?? ""),
      ...industries.map((i) => i.nameKey),
      ...rules.map((r) => r.messageKey),
    ].filter((k) => !k.startsWith("visa.rule.test."));
    expect(regions.length).toBe(17);
    expect(required.length).toBeGreaterThan(50);

    for (const locale of LOCALES) {
      const keys = keysOf(locale);
      const missing = required.filter((k) => !keys.has(k));
      expect(missing, locale).toEqual([]);
    }
  });
});
