/**
 * Select options of the admin rule form (R-215): visa codes and industries from the reference
 * tables, result messages that exist in all six locales (messageKeys.ts). Admin screens are Korean;
 * display labels made of fixed admin copy are built in src/app/admin/_i18n/ko.ts (STANDARD 3.6).
 */
import { db } from "@/lib/db";

import { ruleMessageOptions } from "./messageKeys";

export async function ruleOptions(client: typeof db = db) {
  const [visaTypes, industries] = await Promise.all([
    client.visaType.findMany({
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      select: { code: true, isStatusCode: true, active: true },
    }),
    client.industry.findMany({
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      select: { code: true, nameKo: true },
    }),
  ]);
  const messages = ruleMessageOptions();
  const industryNames = new Map(industries.map((i) => [i.code, i.nameKo]));
  const messageTexts = new Map(messages.map((m) => [m.key, m.text]));
  return {
    /** Codes and flags only; the admin page builds the Korean label (`visaOptions`, _i18n/ko.ts). */
    visaTypes,
    industries: industries.map((i) => ({ value: i.code, label: `${i.code} · ${i.nameKo}` })),
    messages: messages.map((m) => ({ value: m.key, label: m.text })),
    industryName: (code: string) => industryNames.get(code) ?? code,
    /** Korean text of a message key; the key itself when it has no text in every locale. */
    messageText: (key: string) => messageTexts.get(key) ?? key,
  };
}
