import type { Metadata } from "next";
import { BadgeCheck, Building2 } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ComingSoon } from "@/components/common/coming-soon";
import { PageShell } from "@/components/public/page-shell";
import { RegistrationInfo } from "@/components/public/registration-info";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({ locale, path: "/fees", key: "fees" });
}

/**
 * R-102 /fees: "구직자 이용료 없음" (BR-10) and the registration details. The employer fee table is
 * not invented here (PC-7): until the operator publishes it, the employer part shows "준비 중".
 */
export default async function FeesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("public.fees");
  const tc = await getTranslations("common");

  return (
    <PageShell eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")}>
      <div className="grid gap-14">
        <div className="grid gap-4 md:grid-cols-2">
          <section className="grid content-start gap-3 rounded-lg border border-border bg-white p-6.5 shadow-1">
            <BadgeCheck
              aria-hidden="true"
              strokeWidth={1.5}
              className="size-6 text-brand-blue-600"
            />
            <h2 className="text-h3 text-navy">{t("seeker.title")}</h2>
            <p className="text-h2 text-navy" data-testid="no-seeker-fee">
              {tc("noSeekerFee")}
            </p>
            <p className="text-dense text-n700">{t("seeker.body")}</p>
          </section>
          <section className="grid content-start gap-3 rounded-lg border border-border bg-white p-6.5 shadow-1">
            <Building2 aria-hidden="true" strokeWidth={1.5} className="size-6 text-navy" />
            <h2 className="text-h3 text-navy">{t("employer.title")}</h2>
            <p className="text-dense text-n700">{t("employer.body")}</p>
          </section>
        </div>
        <ComingSoon />
        <section aria-labelledby="fees-registration" className="grid gap-5">
          <h2 id="fees-registration" className="text-h2 text-navy">
            {t("registration.title")}
          </h2>
          <RegistrationInfo />
        </section>
      </div>
    </PageShell>
  );
}
