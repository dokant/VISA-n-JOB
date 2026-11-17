/**
 * Select options of the admin rule form (R-215): visa codes and industries from the reference
 * tables, result messages that exist in all six locales (messageKeys.ts). Admin screens are Korean.
 */
import { db } from "@/lib/db";

import { ruleMessageOptions } from "./messageKeys";

type Option = { value: string; label: string };

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
  const visas: Option[] = visaTypes.map((v) => ({
    value: v.code,
    label: `${v.code}${v.isStatusCode ? "" : " (체류자격 코드 아님)"}${v.active ? "" : " · 사용 안 함"}`,
  }));
  return {
    visas,
    industries: industries.map((i) => ({ value: i.code, label: `${i.code} · ${i.nameKo}` })),
    messages: messages.map((m) => ({ value: m.key, label: m.text })),
    industryName: (code: string) => industryNames.get(code) ?? code,
    /** Korean text of a message key; the key itself when it has no text in every locale. */
    messageText: (key: string) => messageTexts.get(key) ?? key,
  };
}
