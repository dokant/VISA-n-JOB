/**
 * Visa check engine (R-126, WO §10, BR-11, BR-12).
 *
 * - Only PUBLISHED VisaRule rows are used. DRAFT / RETIRED (and every seeded SAMPLE row) are ignored.
 * - When no published rule matches, the result is YELLOW + "행정사 확인 필요" (WO §15-9).
 * - The engine never generates a judgement itself (no LLM, no constants): it only compares the input
 *   with the rule's `conditions` JSON (structure in src/schemas/visa/ruleConditions.ts).
 * - Every result carries the reference disclaimer key; the UI (OutcomeCard) always renders it.
 */
import type { Outcome, RuleStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { NEEDS_REVIEW_MESSAGE_KEY, REFERENCE_DISCLAIMER_KEY } from "@/lib/visa-engine/constants";
import {
  type ConditionLeaf,
  type ConditionNode,
  type RuleConditions,
  ruleConditionsSchema,
} from "@/schemas/visa/ruleConditions";

export { NEEDS_REVIEW_MESSAGE_KEY, REFERENCE_DISCLAIMER_KEY };

export type FactValue = string | number | boolean | null | undefined;
export type VisaFacts = Readonly<Record<string, FactValue>>;

export type EvaluateInput = {
  visaCode: string;
  industryCode?: string | null;
  sido?: string | null;
  /** Additional facts (education, Korean level, years of stay …) referenced by rule conditions. */
  facts?: VisaFacts;
};

export type VisaRuleRecord = {
  id: string;
  visaCode: string;
  industryCode: string | null;
  conditions: unknown;
  outcome: Outcome;
  messageKey: string;
  version: number;
  status: RuleStatus;
};

export type EvaluateResult = {
  outcome: Outcome;
  messageKey: string;
  /** The rule that decided the result; null when no published rule matched. */
  ruleId: string | null;
  matched: boolean;
  disclaimerKey: typeof REFERENCE_DISCLAIMER_KEY;
};

function isGroupAll(node: ConditionNode): node is { all: ConditionNode[] } {
  return "all" in node;
}
function isGroupAny(node: ConditionNode): node is { any: ConditionNode[] } {
  return "any" in node;
}
function isGroupNot(node: ConditionNode): node is { not: ConditionNode } {
  return "not" in node;
}

function isPresent(value: FactValue): boolean {
  return value !== null && value !== undefined && value !== "";
}

function compareNumbers(fact: FactValue, value: unknown, cmp: (a: number, b: number) => boolean) {
  return typeof fact === "number" && typeof value === "number" && cmp(fact, value);
}

function evaluateLeaf(leaf: ConditionLeaf, facts: VisaFacts): boolean {
  const fact = facts[leaf.field];
  const { value } = leaf;
  switch (leaf.op) {
    case "eq":
      return isPresent(fact) && fact === value;
    case "neq":
      return isPresent(fact) && fact !== value;
    case "in":
      return (
        isPresent(fact) &&
        Array.isArray(value) &&
        (value as Array<string | number>).some((v) => v === fact)
      );
    case "notIn":
      return (
        isPresent(fact) &&
        Array.isArray(value) &&
        !(value as Array<string | number>).some((v) => v === fact)
      );
    case "exists":
      return isPresent(fact);
    case "notExists":
      return !isPresent(fact);
    case "gt":
      return compareNumbers(fact, value, (a, b) => a > b);
    case "gte":
      return compareNumbers(fact, value, (a, b) => a >= b);
    case "lt":
      return compareNumbers(fact, value, (a, b) => a < b);
    case "lte":
      return compareNumbers(fact, value, (a, b) => a <= b);
  }
}

export function evaluateNode(node: ConditionNode, facts: VisaFacts): boolean {
  if (isGroupAll(node)) return node.all.every((n) => evaluateNode(n, facts));
  if (isGroupAny(node)) return node.any.some((n) => evaluateNode(n, facts));
  if (isGroupNot(node)) return !evaluateNode(node.not, facts);
  return evaluateLeaf(node, facts);
}

/** True when every group present at the top level holds. An empty object always holds. */
export function evaluateConditions(conditions: RuleConditions, facts: VisaFacts): boolean {
  if (conditions.all && !conditions.all.every((n) => evaluateNode(n, facts))) return false;
  if (conditions.any && !conditions.any.some((n) => evaluateNode(n, facts))) return false;
  if (conditions.not && evaluateNode(conditions.not, facts)) return false;
  return true;
}

function needsReview(): EvaluateResult {
  return {
    outcome: "YELLOW",
    messageKey: NEEDS_REVIEW_MESSAGE_KEY,
    ruleId: null,
    matched: false,
    disclaimerKey: REFERENCE_DISCLAIMER_KEY,
  };
}

function buildFacts(input: EvaluateInput): VisaFacts {
  return {
    ...input.facts,
    visaCode: input.visaCode,
    industryCode: input.industryCode ?? null,
    sido: input.sido ?? null,
  };
}

/**
 * Pure evaluation over the given rules. Non-PUBLISHED rows and rows whose conditions JSON does not
 * parse are ignored. Among matching rules, an industry-specific rule wins over a generic one
 * (industryCode null), then the higher version, then the id (deterministic).
 */
export function evaluateRules(
  input: EvaluateInput,
  rules: readonly VisaRuleRecord[],
): EvaluateResult {
  const facts = buildFacts(input);
  const industry = input.industryCode ?? null;

  const candidates = rules.filter(
    (r) =>
      r.status === "PUBLISHED" &&
      r.visaCode === input.visaCode &&
      (r.industryCode === null || r.industryCode === industry),
  );

  const matching = candidates.filter((r) => {
    const parsed = ruleConditionsSchema.safeParse(r.conditions);
    return parsed.success && evaluateConditions(parsed.data, facts);
  });
  if (matching.length === 0) return needsReview();

  matching.sort((a, b) => {
    const specificity = Number(b.industryCode !== null) - Number(a.industryCode !== null);
    if (specificity !== 0) return specificity;
    if (b.version !== a.version) return b.version - a.version;
    return a.id.localeCompare(b.id);
  });
  const rule = matching[0];
  return {
    outcome: rule.outcome,
    messageKey: rule.messageKey,
    ruleId: rule.id,
    matched: true,
    disclaimerKey: REFERENCE_DISCLAIMER_KEY,
  };
}

type RuleReader = {
  visaRule: {
    findMany(args: { where: { visaCode: string; status: RuleStatus } }): Promise<VisaRuleRecord[]>;
  };
};

/** Loads the PUBLISHED rules for the visa code and evaluates them. */
export async function evaluate(
  input: EvaluateInput,
  client: RuleReader = db,
): Promise<EvaluateResult> {
  const rules = await client.visaRule.findMany({
    where: { visaCode: input.visaCode, status: "PUBLISHED" },
  });
  return evaluateRules(input, rules);
}
