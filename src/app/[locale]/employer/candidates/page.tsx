// P2b prerequisite: moved from `(public)/employer/candidates` (P1a placeholder) into the employer area,
// where the real R-205 screen replaces it. Until then: flag-off state (SC-07) only.
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ComingSoon } from "@/components/common/coming-soon";
import { PageShell } from "@/components/public/page-shell";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  // R-130 / WO §13: never indexed (also disallowed in robots.txt and sent with X-Robots-Tag).
  return buildPageMetadata({
    locale,
    path: "/employer/candidates",
    key: "employerCandidates",
    noindex: true,
  });
}

/**
 * Placeholder for /employer/candidates (flag FEATURE_EMPLOYER_CANDIDATES; the real screen is R-205
 * in P2b). Until then it is the SC-07 flag-off state: ComingSoon, 200, noindex. No candidate data
 * is read here.
 */
export default async function EmployerCandidatesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("meta.employerCandidates");
  return (
    <PageShell title={t("title")} lead={t("description")}>
      <ComingSoon />
    </PageShell>
  );
}
