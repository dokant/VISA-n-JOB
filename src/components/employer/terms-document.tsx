import { compileMDX } from "next-mdx-remote/rsc";
import type { ReactNode } from "react";

import { ExpertReviewMark } from "@/components/legal/expert-review-mark";
import { getTermsDocument } from "@/lib/employer/contract";

/** Markdown elements of the terms draft, in the project type scale. */
const components = {
  h1: (p: { children?: ReactNode }) => <h2 className="text-h3 text-navy">{p.children}</h2>,
  h2: (p: { children?: ReactNode }) => (
    <h3 className="mt-5 text-body font-semibold text-navy">{p.children}</h3>
  ),
  h3: (p: { children?: ReactNode }) => (
    <h4 className="mt-4 text-dense font-semibold text-navy">{p.children}</h4>
  ),
  p: (p: { children?: ReactNode }) => <p className="mt-2">{p.children}</p>,
  ul: (p: { children?: ReactNode }) => <ul className="mt-2 list-disc ps-5">{p.children}</ul>,
  hr: () => <hr className="my-6 border-n200" />,
};

/** Marker paragraph the draft carries in the file (N-03); rendered as ExpertReviewMark instead. */
const EXPERT_REVIEW_LINE = /^\[전문가 검토 필요\].*$/m;

/**
 * 구인 서비스 이용약관 (R-208, WO §9.4) from `content/terms/employer/{version}/{locale}.md`:
 * title, then ExpertReviewMark (S-19), then the body. Translations carry the Korean original at the
 * end of the file (SC-08).
 */
export async function TermsDocument({ locale }: { locale: string }) {
  const doc = getTermsDocument(locale);
  const lines = doc.body.replace(EXPERT_REVIEW_LINE, "").split(/\r?\n/);
  const titleIndex = lines.findIndex((l) => l.startsWith("# "));
  const title = titleIndex >= 0 ? lines.slice(0, titleIndex + 1).join("\n") : "";
  const rest = titleIndex >= 0 ? lines.slice(titleIndex + 1).join("\n") : lines.join("\n");
  const [head, body] = await Promise.all([
    compileMDX({ source: title, components }),
    compileMDX({ source: rest, components }),
  ]);
  return (
    <article
      className="rounded-md border border-border bg-white p-6 text-dense text-n700 shadow-1"
      data-testid="terms-document"
      data-version={doc.version}
      lang={doc.locale}
    >
      {head.content}
      <ExpertReviewMark className="mt-3" />
      {body.content}
    </article>
  );
}
