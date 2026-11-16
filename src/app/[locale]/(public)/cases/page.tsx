import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ComingSoon } from "@/components/common/coming-soon";
import { PageShell } from "@/components/public/page-shell";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  // No reviewed cases yet: kept out of the index until content exists.
  return buildPageMetadata({ locale, path: "/cases", key: "cases", noindex: true });
}

/** R-131 /cases skeleton: no cases are invented (PC-7); reviewed, de-identified cases come later. */
export default async function CasesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("public.cases");
  return (
    <PageShell eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")}>
      <ComingSoon title={t("emptyTitle")} description={t("emptyBody")} />
    </PageShell>
  );
}
