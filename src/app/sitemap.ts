import type { MetadataRoute } from "next";

import { isFeatureEnabled } from "@/config/flags";
import { getSiteConfig } from "@/config/site.config";
import { locales } from "@/i18n/locales";
import { listGuideSlugs } from "@/lib/guide";
import { languageAlternates, localizedPath } from "@/lib/seo/metadata";

// Flags are read at request time (SC-07: flag-off pages are left out of the sitemap).
export const dynamic = "force-dynamic";

/**
 * sitemap.xml (R-130, WO §13). Every indexable public page in the 6 locales with hreflang
 * alternates. Excluded: flag-off pages (/demand, /jobs — SC-07), noindex pages (/cases skeleton,
 * /score/e74 while "준비 중"), /employer/candidates and /admin (never indexed).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const { siteUrl } = getSiteConfig();
  const paths = [
    "/",
    "/about",
    "/fees",
    "/privacy",
    "/terms",
    "/visa-check",
    "/guide",
    ...listGuideSlugs().map((slug) => `/guide/${slug}`),
    ...(isFeatureEnabled("FEATURE_DEMAND_MAP") ? ["/demand"] : []),
  ];

  return paths.flatMap((path) =>
    locales.map((locale) => ({
      url: `${siteUrl}${localizedPath(locale, path)}`,
      changeFrequency: "weekly" as const,
      alternates: {
        languages: Object.fromEntries(
          Object.entries(languageAlternates(path)).map(([lang, href]) => [
            lang,
            `${siteUrl}${href}`,
          ]),
        ),
      },
    })),
  );
}
