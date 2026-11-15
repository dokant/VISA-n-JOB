// Supported locales (WO §12, R-014). ko is the source language.
export const locales = ["ko", "en", "vi", "ru", "zh", "uz"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ko";

// Autonyms: each language is shown in its own name (STANDARD 3.2 LocaleSwitcher).
// uz uses Latin script (DECISIONS SC-09). U+02BB in "Oʻzbekcha".
export const localeNames: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
  vi: "Tiếng Việt",
  ru: "Русский",
  zh: "中文",
  uz: "Oʻzbekcha",
};
