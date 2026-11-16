import type { Metadata } from "next";
import { Check } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageShell } from "@/components/public/page-shell";
import { RegistrationInfo } from "@/components/public/registration-info";
import { getSiteConfig } from "@/config/site.config";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({ locale, path: "/about", key: "about" });
}

/** R-102 /about: operating principles, the two registered operators, operator contact (#contact). */
export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("public.about");
  const tc = await getTranslations("common");
  const site = getSiteConfig();
  const principles = [
    t("principles.p1"),
    t("principles.p2"),
    t("principles.p3"),
    t("principles.p4"),
  ];

  return (
    <PageShell eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")}>
      <div className="grid gap-14">
        <section aria-labelledby="about-principles" className="grid gap-5">
          <h2 id="about-principles" className="text-h2 text-navy">
            {t("principles.title")}
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {principles.map((p) => (
              <li
                key={p}
                className="flex gap-3 rounded-md border border-border bg-white p-5 text-dense text-n700 shadow-1"
              >
                <Check
                  aria-hidden="true"
                  strokeWidth={2}
                  className="mt-0.5 size-4 flex-none text-brand-blue-600"
                />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="about-operators" className="grid gap-5">
          <h2 id="about-operators" className="text-h2 text-navy">
            {t("operators.title")}
          </h2>
          <RegistrationInfo />
        </section>

        <section
          id="contact"
          aria-labelledby="about-contact"
          className="grid scroll-mt-24 gap-3 rounded-lg border border-n200 bg-n50 p-6.5"
        >
          <h2 id="about-contact" className="text-h2 text-navy">
            {t("contact.title")}
          </h2>
          <p className="text-dense text-n700">{t("contact.body")}</p>
          {site.contact.phone ? (
            <p className="text-h3 text-navy tabular-nums" data-testid="operator-phone">
              {site.contact.phone}
            </p>
          ) : null}
          <p className="text-caption text-n500">{tc("contactViaOperator")}</p>
        </section>
      </div>
    </PageShell>
  );
}
