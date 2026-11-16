import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ComingSoon } from "@/components/common/coming-soon";
import { PageShell } from "@/components/public/page-shell";
import { redirect } from "@/i18n/navigation";
import { currentSeekerId } from "@/lib/seeker/session";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    locale,
    path: "/seeker/me/recommended",
    key: "seekerRecommended",
    noindex: true,
  });
}

/**
 * /[locale]/seeker/me/recommended — target of the completion screen's "추천 일자리 보기" (R-112).
 * The list itself (PC-13) comes with the blind postings in Phase 2; until then: ComingSoon.
 */
export default async function SeekerRecommendedPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await currentSeekerId())) {
    redirect({ href: "/seeker/login?next=/seeker/me/recommended", locale });
  }
  const t = await getTranslations("seeker.recommended");
  return (
    <PageShell eyebrow={t("eyebrow")} title={t("title")} narrow>
      <ComingSoon description={t("description")} />
    </PageShell>
  );
}
