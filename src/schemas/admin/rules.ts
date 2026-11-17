import { z } from "zod";

import { RULE_JSON_MAX_CHARS } from "@/config/limits";
import { ruleConditionsSchema } from "@/schemas/visa/ruleConditions";
import { scoreTableItemsSchema } from "@/schemas/score/scoreTable";

/**
 * 규칙 DB·점수표 관리 폼 (R-215). Structure only: the values (conditions, points, pass score) are typed
 * by the 행정사 — no legal value is defined here (BR-12). Reference codes (visa, industry, message
 * key) are checked against the database / messages in src/lib/rules/manage.ts.
 *
 * `conditions` / `items` arrive as JSON text from a textarea and are parsed here; a parse or shape
 * error answers INVALID_JSON / INVALID_SHAPE (form-level codes, src/lib/rules/manage.ts).
 */
const id = z.string().trim().min(1).max(64);
const code = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/);

export const OUTCOMES = ["GREEN", "YELLOW", "RED"] as const;

/** JSON text → value; refuses anything that is not a JSON object. */
export function parseJsonObject(text: string): { ok: true; value: object } | { ok: false } {
  if (text.length > RULE_JSON_MAX_CHARS) return { ok: false };
  try {
    const value: unknown = JSON.parse(text);
    if (value === null || typeof value !== "object" || Array.isArray(value)) return { ok: false };
    return { ok: true, value };
  } catch {
    return { ok: false };
  }
}

export const visaRuleDraftSchema = z.object({
  visaCode: code,
  industryCode: z.union([z.literal(""), code]).transform((v) => (v === "" ? null : v)),
  outcome: z.enum(OUTCOMES),
  messageKey: z
    .string()
    .trim()
    .regex(/^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)+$/),
  conditions: z.string().max(RULE_JSON_MAX_CHARS),
});
export type VisaRuleDraftInput = z.infer<typeof visaRuleDraftSchema>;

export const scoreTableDraftSchema = z.object({
  name: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9][A-Za-z0-9-]{0,19}$/),
  passScore: z
    .string()
    .trim()
    .refine((v) => v === "" || /^-?[0-9]{1,6}$/.test(v))
    .transform((v) => (v === "" ? null : Number(v))),
  items: z.string().max(RULE_JSON_MAX_CHARS),
});
export type ScoreTableDraftInput = z.infer<typeof scoreTableDraftSchema>;

export const ruleIdSchema = z.object({ id });

/** Parsed `conditions` (shape of src/schemas/visa/ruleConditions.ts). */
export function parseConditions(text: string) {
  const json = parseJsonObject(text);
  if (!json.ok) return { ok: false as const, code: "INVALID_JSON" as const };
  const parsed = ruleConditionsSchema.safeParse(json.value);
  return parsed.success
    ? { ok: true as const, value: parsed.data }
    : { ok: false as const, code: "INVALID_SHAPE" as const };
}

/** Parsed `items` (shape of src/schemas/score/scoreTable.ts). */
export function parseScoreItems(text: string) {
  const json = parseJsonObject(text);
  if (!json.ok) return { ok: false as const, code: "INVALID_JSON" as const };
  const parsed = scoreTableItemsSchema.safeParse(json.value);
  return parsed.success
    ? { ok: true as const, value: parsed.data }
    : { ok: false as const, code: "INVALID_SHAPE" as const };
}
