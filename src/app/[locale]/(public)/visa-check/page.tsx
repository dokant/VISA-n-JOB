import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageShell } from "@/components/public/page-shell";
import { VisaCheckForm } from "@/components/visa/visa-check-form";
import { Link } from "@/i18n/navigation";
import { getIndustries, getSidoRegions, getVisaTypes } from "@/lib/referenceData";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { runVisaCheck } from "@/server/actions/visa/evaluateVisa";

type Search = Record<string, string | string[] | undefined>;
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Search> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({ locale, path: "/visa-check", key: "visaCheck" });
}

const one = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);

/**
 * R-126 /visa-check. Reference data from the database; the result comes only from evaluate.ts
 * (PUBLISHED rules) and always carries "참고용, 행정사 확인 필요". Query parameters
 * (?visaCode=&sido=&industryCode=, e.g. from the demand map) prefill the form and, when a visa is
 * given, the result is computed on the server so it also shows without JavaScript.
 */
export default async function VisaCheckPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("public.visaCheck");
  const tr = await getTranslations();
  const query = await searchParams;
  const defaults = {
    visaCode: one(query.visaCode),
    sido: one(query.sido),
    industryCode: one(query.industryCode),
  };

  const [visaTypes, sidos, industries] = await Promise.all([
    getVisaTypes(),
    getSidoRegions(),
    getIndustries(),
  ]);
  const initialState = defaults.visaCode ? await runVisaCheck(defaults) : undefined;

  return (
    <PageShell eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")}>
      <div className="grid max-w-180 gap-6">
        <VisaCheckForm
          visaInput="select"
          visas={visaTypes.map((v) => ({
            code: v.code,
            nameKey: v.nameKey,
            label: tr(v.nameKey),
            isStatusCode: v.isStatusCode,
          }))}
          sidos={sidos.map((s) => ({ code: s.code, label: tr(s.nameKey) }))}
          industries={industries.map((i) => ({ code: i.code, label: tr(i.nameKey) }))}
          defaults={defaults}
          initialState={initialState}
        />
        <Link
          href="/score/e74"
          className="inline-flex min-h-11 min-w-11 w-fit items-center gap-2 text-dense font-semibold text-brand-blue-600 hover:underline"
        >
          {t("scoreLink")}
          <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-4" />
        </Link>
      </div>
    </PageShell>
  );
}
