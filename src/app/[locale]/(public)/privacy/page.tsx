import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { LegalDocument } from "@/components/public/legal-document";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({ locale, path: "/privacy", key: "privacy" });
}

/** R-102 /privacy — draft with [전문가 검토 필요] (N-03, SC-08). */
export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalDocument doc="privacy" />;
}
