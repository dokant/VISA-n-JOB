import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";

import { ComingSoon } from "@/components/common/coming-soon";
import { PageShell } from "@/components/public/page-shell";
import { ScoreForm } from "@/components/visa/score-form";
import { getPublishedE74Table, localize } from "@/lib/score/e74";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const table = await getPublishedE74Table();
  // SC-07 / R-127: the "준비 중" state is not indexed.
  return buildPageMetadata({ locale, path: "/score/e74", key: "score", noindex: !table });
}

/**
 * R-127 /score/e74. Without a PUBLISHED E-7-4 score table (seed state) the page shows ComingSoon
 * ("준비 중" + 상담 신청). With one, items and bands come from the table and e74.ts computes.
 */
export default async function ScorePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("public.score");
  const table = await getPublishedE74Table();
  const current = await getLocale();

  return (
    <PageShell eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")}>
      {table ? (
        <ScoreForm
          items={table.items.map((item) => ({
            key: item.key,
            label: localize(item.label, current),
            bands: item.bands.map((b) => ({ key: b.key, label: localize(b.label, current) })),
          }))}
        />
      ) : (
        <ComingSoon title={t("comingSoon.title")} description={t("comingSoon.description")} />
      )}
    </PageShell>
  );
}
