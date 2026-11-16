import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { AudienceSelector } from "@/components/home/audience-selector";
import { DemandPreview } from "@/components/home/demand-preview";
import { FinalCta } from "@/components/home/final-cta";
import { Hero } from "@/components/home/hero";
import { TrustMetrics } from "@/components/home/trust-metrics";
import { VisaWidget } from "@/components/home/visa-widget";
import { isFeatureEnabled } from "@/config/flags";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { JsonLd, organizationJsonLd } from "@/lib/seo/jsonld";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ for?: string | string[] }>;
};

// Reads the database (visa types, regions, demand) and runtime flags on every request.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({ locale, path: "/", key: "home", absoluteTitle: true });
}

/**
 * Home (R-101, STANDARD 3.7). Order: SiteNav (layout) → Hero → 대상 선택 → 실적 → 비자 진단 위젯
 * → 수요 지도 미리보기 (flag) → 최종 CTA → SiteFooter (layout).
 */
export default async function HomePage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { for: audience } = await searchParams;
  const demandOn = isFeatureEnabled("FEATURE_DEMAND_MAP");

  return (
    <main id="main">
      <Hero />
      <AudienceSelector initial={typeof audience === "string" ? audience : undefined} />
      <TrustMetrics />
      <VisaWidget />
      {demandOn ? <DemandPreview /> : null}
      <FinalCta />
      <JsonLd data={organizationJsonLd(locale)} />
    </main>
  );
}
