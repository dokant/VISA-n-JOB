import type { MetadataRoute } from "next";

import { getSiteConfig } from "@/config/site.config";

export const dynamic = "force-dynamic";

/**
 * robots.txt (R-130, WO §13): /admin and /employer/candidates are never indexed (the pages and the
 * middleware also send noindex). /demand stays crawlable (WO §13); when its flag is off the page
 * itself is noindex (SC-07).
 */
export default function robots(): MetadataRoute.Robots {
  const { siteUrl } = getSiteConfig();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/*/employer/candidates"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
