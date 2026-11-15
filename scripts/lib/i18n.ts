import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const REVIEW_KEY = "_review";
export const REVIEW_VALUE = "native review required";
export const SOURCE_LOCALE = "ko";
export const LOCALES = ["ko", "en", "vi", "ru", "zh", "uz"] as const;

export type Messages = Record<string, unknown>;

export type LocaleReport = {
  locale: string;
  errors: string[];
  warnings: string[];
};

/** Flattens nested message objects into dot keys. `_review` is metadata and is skipped. */
export function flattenKeys(obj: Messages, prefix = ""): Map<string, unknown> {
  const out = new Map<string, unknown>();
  for (const [key, value] of Object.entries(obj)) {
    if (!prefix && key === REVIEW_KEY) continue;
    const full = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      for (const [k, v] of flattenKeys(value as Messages, full)) out.set(k, v);
    } else {
      out.set(full, value);
    }
  }
  return out;
}

export function checkReviewMarker(messages: Messages): string[] {
  const errors: string[] = [];
  const firstKey = Object.keys(messages)[0];
  if (messages[REVIEW_KEY] !== REVIEW_VALUE) {
    errors.push(`"${REVIEW_KEY}" must be "${REVIEW_VALUE}"`);
  } else if (firstKey !== REVIEW_KEY) {
    errors.push(`"${REVIEW_KEY}" must be the first key (found "${firstKey}")`);
  }
  return errors;
}

/** Compares one locale against the source locale (ko). */
export function compareLocale(locale: string, source: Messages, target: Messages): LocaleReport {
  const report: LocaleReport = { locale, errors: [], warnings: [] };
  report.errors.push(...checkReviewMarker(target));

  const sourceKeys = flattenKeys(source);
  const targetKeys = flattenKeys(target);

  for (const key of sourceKeys.keys()) {
    if (!targetKeys.has(key)) report.errors.push(`missing key: ${key}`);
  }
  for (const [key, value] of targetKeys) {
    if (!sourceKeys.has(key)) report.errors.push(`extra key not in ${SOURCE_LOCALE}: ${key}`);
    if (typeof value !== "string") report.errors.push(`value must be a string: ${key}`);
    else if (value.trim() === "") report.warnings.push(`empty value: ${key}`);
  }
  return report;
}

export function readMessages(file: string): Messages {
  return JSON.parse(readFileSync(file, "utf8")) as Messages;
}

/** Runs the full check over a messages directory. */
export function checkMessagesDir(
  dir: string,
  locales: readonly string[] = LOCALES,
): LocaleReport[] {
  const sourceFile = path.join(dir, `${SOURCE_LOCALE}.json`);
  if (!existsSync(sourceFile)) {
    return [{ locale: SOURCE_LOCALE, errors: [`file not found: ${sourceFile}`], warnings: [] }];
  }
  const source = readMessages(sourceFile);

  return locales.map((locale) => {
    const file = path.join(dir, `${locale}.json`);
    if (!existsSync(file)) return { locale, errors: [`file not found: ${file}`], warnings: [] };
    let target: Messages;
    try {
      target = readMessages(file);
    } catch (error) {
      return { locale, errors: [`invalid JSON: ${(error as Error).message}`], warnings: [] };
    }
    return compareLocale(locale, source, target);
  });
}
