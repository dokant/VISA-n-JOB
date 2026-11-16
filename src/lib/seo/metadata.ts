import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { getSiteConfig } from "@/config/site.config";
import { defaultLocale, locales } from "@/i18n/locales";

/** `/ko` + `/about` → `/ko/about`; `/ko` + `/` → `/ko`. */
export function localizedPath(locale: string, path: string): string {
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/** hreflang alternates for every supported locale + x-default (R-130). Relative to metadataBase. */
export function languageAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of locales) languages[locale] = localizedPath(locale, path);
  languages["x-default"] = localizedPath(defaultLocale, path);
  return languages;
}

type Options = {
  locale: string;
  /** Path without the locale prefix, e.g. "/about". */
  path: string;
  /** meta.{key}.title / meta.{key}.description */
  key: string;
  /** SC-07 ComingSoon pages and private areas: noindex, nofollow. */
  noindex?: boolean;
  /** Use the title as-is (home) instead of the "%s | 사이트명" template. */
  absoluteTitle?: boolean;
};

/** Page metadata: title, description, canonical, hreflang alternates, robots (R-130). */
export async function buildPageMetadata({
  locale,
  path,
  key,
  noindex = false,
  absoluteTitle = false,
}: Options): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "meta" });
  const title = t(`${key}.title`);
  const description = t(`${key}.description`);
  const site = getSiteConfig();

  return {
    metadataBase: new URL(site.siteUrl),
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical: localizedPath(locale, path),
      languages: languageAlternates(path),
    },
    openGraph: {
      title,
      description,
      siteName: t("siteName"),
      locale,
      type: "website",
      url: localizedPath(locale, path),
    },
    robots: noindex ? { index: false, follow: false } : undefined,
  };
}
