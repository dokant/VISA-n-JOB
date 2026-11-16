import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { VisaCheckForm } from "@/components/visa/visa-check-form";
import { getSiteConfig } from "@/config/site.config";
import { Link } from "@/i18n/navigation";
import { localeNames, locales } from "@/i18n/locales";
import { getIndustries, getSidoRegions, getVisaTypes } from "@/lib/referenceData";

/**
 * STANDARD v2 3.7 #10 = R-101 ② 비자 진단 위젯 + ⑥ "구직자 이용료 없음" + ⑤ 수수료 링크.
 * Handoff job-seeker section with the search card turned into the visa check (K-06): visa boxes
 * from the VisaType table (no codes in code, BR-12), 시·도 / 업종 selects, result from evaluate.ts
 * shown in OutcomeCard. Flags, job list, job counts and messenger buttons are removed (K-01, K-06).
 */
export async function VisaWidget() {
  const t = await getTranslations("public.home.visaWidget");
  const tr = await getTranslations();
  const site = getSiteConfig();
  const [visaTypes, sidos, industries] = await Promise.all([
    getVisaTypes(),
    getSidoRegions(),
    getIndustries(),
  ]);

  const visas = visaTypes
    .filter((v) => v.registrable)
    .map((v) => ({ code: v.code, nameKey: v.nameKey, label: tr(v.nameKey) }));

  return (
    <section
      id="visa-check"
      className="vj-seek relative overflow-hidden py-section"
      aria-labelledby="visa-widget-title"
      data-testid="home-visa-widget"
    >
      <div className="mx-auto grid max-w-site items-center gap-14 px-gutter xl:grid-cols-2">
        <div className="grid content-start gap-5.5">
          <span className="reveal inline-flex w-fit items-center gap-2.25 rounded-full border border-navy/9 bg-white px-3.5 py-1.75 text-meta font-semibold text-navy shadow-1">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-brand-orange" />
            {t("hello")}
          </span>
          <h2 id="visa-widget-title" className="reveal text-h2 text-navy">
            {t("title")}
            <br />
            {t("titleLine2")}
          </h2>
          <p className="reveal text-lead text-n700">
            {t("lead")}{" "}
            <b className="font-semibold text-navy" data-testid="no-seeker-fee">
              {tr("common.noSeekerFee")}
            </b>
          </p>
          <Link
            href={site.feesPath}
            className="reveal inline-flex min-h-11 w-fit items-center gap-2 text-dense font-semibold text-brand-blue-600 underline-offset-4 hover:underline"
            data-testid="fees-link"
          >
            {t("feesLink")}
            <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-4" />
          </Link>
          <div className="reveal grid gap-2">
            <span className="text-label text-n700">{t("languagesLabel")}</span>
            <ul className="flex flex-wrap gap-1.5">
              {locales.map((locale) => (
                <li
                  key={locale}
                  lang={locale}
                  className="vj-lang-chip rounded-full px-2.25 py-1 text-caption font-medium text-n700"
                >
                  {localeNames[locale]}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="vj-searchcard reveal grid gap-4 rounded-xl border border-white/70 bg-white p-6">
          <div className="flex items-center justify-between gap-3.5">
            <h3 className="text-body font-semibold text-navy">{t("card.title")}</h3>
            <Badge variant="cyan">{t("card.badge")}</Badge>
          </div>
          <VisaCheckForm
            visaInput="boxes"
            visas={visas}
            sidos={sidos.map((s) => ({ code: s.code, label: tr(s.nameKey) }))}
            industries={industries.map((i) => ({ code: i.code, label: tr(i.nameKey) }))}
          />
          <Link
            href="/visa-check"
            className="inline-flex min-h-11 items-center justify-center gap-2 text-dense font-semibold text-navy hover:text-brand-blue-600"
          >
            {t("card.more")}
            <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
