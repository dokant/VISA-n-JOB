/**
 * Result message keys a VisaRule may use (R-215). The public result card shows `t(messageKey)`
 * (OutcomeCard), so a rule may only point at a key that exists in all six messages files: every
 * string key under `visa.rule.*` plus the "행정사 확인 필요" key. New wording is added to messages/*.json
 * (6 locales, native review — STANDARD 3.6) before a rule can use it; staff never type free text that
 * reaches the public screen.
 */
import { locales } from "@/i18n/locales";
import { NEEDS_REVIEW_MESSAGE_KEY } from "@/lib/visa-engine/constants";

import en from "../../../messages/en.json";
import ko from "../../../messages/ko.json";
import ru from "../../../messages/ru.json";
import uz from "../../../messages/uz.json";
import vi from "../../../messages/vi.json";
import zh from "../../../messages/zh.json";

type Tree = { [key: string]: unknown };

const ALL: Record<string, Tree> = { ko, en, vi, ru, zh, uz };

function lookup(tree: Tree, key: string): unknown {
  return key.split(".").reduce<unknown>((node, part) => {
    if (node !== null && typeof node === "object") return (node as Tree)[part];
    return undefined;
  }, tree);
}

function stringKeys(node: unknown, prefix: string): string[] {
  if (typeof node === "string") return [prefix];
  if (node === null || typeof node !== "object") return [];
  return Object.entries(node as Tree).flatMap(([k, v]) => stringKeys(v, `${prefix}.${k}`));
}

export type RuleMessageOption = { key: string; text: string };

/** Keys usable as `VisaRule.messageKey`, with their Korean text (admin screen is Korean only). */
export function ruleMessageOptions(): RuleMessageOption[] {
  const keys = [NEEDS_REVIEW_MESSAGE_KEY, ...stringKeys(lookup(ko, "visa.rule"), "visa.rule")];
  return keys
    .filter((key) => locales.every((l) => typeof lookup(ALL[l], key) === "string"))
    .map((key) => ({ key, text: String(lookup(ko, key)) }));
}

export function isRuleMessageKey(key: string): boolean {
  return ruleMessageOptions().some((o) => o.key === key);
}
