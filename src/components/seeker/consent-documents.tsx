import { compileMDX } from "next-mdx-remote/rsc";
import type { ReactNode } from "react";

import { getConsentDocument } from "@/lib/seeker/consent";
import type { RegistrationConsent } from "@/lib/seeker/options";

/** Markdown elements of a consent draft, in the project type scale. */
const components = {
  h1: (p: { children?: ReactNode }) => (
    <p className="text-body font-semibold text-navy">{p.children}</p>
  ),
  h2: (p: { children?: ReactNode }) => <p className="mt-3 font-semibold text-navy">{p.children}</p>,
  p: (p: { children?: ReactNode }) => <p className="mt-2">{p.children}</p>,
  ul: (p: { children?: ReactNode }) => <ul className="mt-2 list-disc ps-5">{p.children}</ul>,
  hr: () => <hr className="my-3 border-n200" />,
};

/**
 * Consent bodies of the current version from `content/consents/{type}/{version}/{locale}.md`
 * (R-110, N-03: each draft carries [전문가 검토 필요]; translations include the Korean original).
 * Server-rendered and handed to the client form as elements.
 */
export async function loadConsentDocuments(
  types: readonly RegistrationConsent[],
  locale: string,
): Promise<Partial<Record<RegistrationConsent, ReactNode>>> {
  const out: Partial<Record<RegistrationConsent, ReactNode>> = {};
  for (const type of types) {
    const doc = getConsentDocument(type, locale);
    const { content } = await compileMDX({ source: doc.body, components });
    out[type] = (
      <div data-testid={`consent-body-${type}`} data-version={doc.version}>
        {content}
      </div>
    );
  }
  return out;
}
