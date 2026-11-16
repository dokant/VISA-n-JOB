import { createElement } from "react";

import { getSiteConfig } from "@/config/site.config";

import { localizedPath } from "./metadata";

/**
 * schema.org JSON-LD builders (WO §13, R-130, R-131). Allowed types: Organization, FAQPage,
 * BreadcrumbList. A job-posting type is never emitted (WO §13, S-71).
 */
type JsonLdObject = Record<string, unknown> & {
  "@type": "Organization" | "FAQPage" | "BreadcrumbList";
};

export function organizationJsonLd(locale: string): JsonLdObject {
  const site = getSiteConfig();
  const placement = site.jobPlacementAgency;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.brand.nameKo,
    alternateName: site.brand.wordmark,
    url: `${site.siteUrl}${localizedPath(locale, "/")}`,
    ...(site.contact.phone ? { telephone: site.contact.phone } : {}),
    ...(placement.address
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: placement.address,
            addressCountry: "KR",
          },
        }
      : {}),
    identifier: [
      placement.jobPlacementRegNo,
      site.adminScrivenerOffice.adminScrivenerRegNo,
      site.adminScrivenerOffice.businessRegNo,
    ].filter(Boolean),
  };
}

export function faqPageJsonLd(items: Array<{ question: string; answer: string }>): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.question,
      acceptedAnswer: { "@type": "Answer", text: i.answer },
    })),
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>): JsonLdObject {
  const site = getSiteConfig();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${site.siteUrl}${item.path}`,
    })),
  };
}

/** Renders a JSON-LD <script>. `<` is escaped so content can never close the script tag. */
export function JsonLd({ data }: { data: JsonLdObject }) {
  return createElement("script", {
    type: "application/ld+json",
    dangerouslySetInnerHTML: { __html: JSON.stringify(data).replace(/</g, "\\u003c") },
  });
}
