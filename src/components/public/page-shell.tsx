import type { ReactNode } from "react";

import { SectionHeader } from "@/components/common/section-header";
import { cn } from "@/lib/utils";

type Props = {
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  /** Rendered right under the title block (e.g. ExpertReviewMark). */
  afterHeader?: ReactNode;
  children: ReactNode;
  /** Narrow 720px column for legal / text pages (STANDARD 2.4). */
  narrow?: boolean;
};

/**
 * Non-home public page frame (STANDARD 3.7 last paragraph): no hero, the nav is already in its
 * scrolled look, SectionHeader with the page H1 (text-h1), then content on white / n50 bands.
 */
export function PageShell({ eyebrow, title, lead, afterHeader, children, narrow = false }: Props) {
  return (
    <main id="main" className="pt-16 md:pt-19">
      <div className="border-b border-n200 bg-n50">
        <div
          className={cn(
            "mx-auto px-gutter py-section-tight",
            narrow ? "max-w-180 box-content" : "max-w-site",
          )}
        >
          <SectionHeader as="h1" eyebrow={eyebrow} title={title} lead={lead} />
          {afterHeader ? <div className="mt-5">{afterHeader}</div> : null}
        </div>
      </div>
      <div
        className={cn(
          "mx-auto px-gutter py-section-tight",
          narrow ? "max-w-180 box-content" : "max-w-site",
        )}
      >
        {children}
      </div>
    </main>
  );
}
