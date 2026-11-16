import { compileMDX } from "next-mdx-remote/rsc";
import type { ReactNode } from "react";

import { ExpertReviewMark } from "@/components/legal/expert-review-mark";
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

/** Marker paragraph the drafts carry in the file (N-03); rendered as ExpertReviewMark instead. */
const EXPERT_REVIEW_LINE = /^\[전문가 검토 필요\].*$/m;

/** Splits a draft into its "# 제목" line and the rest, without the marker paragraph. */
function splitDraft(body: string): { title: string; rest: string } {
  const withoutMarker = body.replace(EXPERT_REVIEW_LINE, "");
  const lines = withoutMarker.split(/\r?\n/);
  const titleIndex = lines.findIndex((l) => l.startsWith("# "));
  if (titleIndex < 0) return { title: "", rest: withoutMarker };
  return {
    title: lines.slice(0, titleIndex + 1).join("\n"),
    rest: lines.slice(titleIndex + 1).join("\n"),
  };
}

/**
 * Consent bodies of the current version from `content/consents/{type}/{version}/{locale}.md`
 * (R-110, N-03: each draft carries [전문가 검토 필요], shown as ExpertReviewMark under the title;
 * translations include the Korean original).
 * Server-rendered and handed to the client form as elements.
 */
export async function loadConsentDocuments(
  types: readonly RegistrationConsent[],
  locale: string,
): Promise<Partial<Record<RegistrationConsent, ReactNode>>> {
  const out: Partial<Record<RegistrationConsent, ReactNode>> = {};
  for (const type of types) {
    const doc = getConsentDocument(type, locale);
    const { title, rest } = splitDraft(doc.body);
    const [head, body] = await Promise.all([
      compileMDX({ source: title, components }),
      compileMDX({ source: rest, components }),
    ]);
    // STANDARD 3.2 ExpertReviewMark: right under the document title (S-19).
    out[type] = (
      <div data-testid={`consent-body-${type}`} data-version={doc.version}>
        {head.content}
        <ExpertReviewMark className="mt-2" />
        {body.content}
      </div>
    );
  }
  return out;
}
