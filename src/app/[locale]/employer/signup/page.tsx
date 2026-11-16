import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ScopedIntlProvider } from "@/components/common/scoped-intl-provider";
import { EmployerSignupForm } from "@/components/employer/employer-signup-form";
import { PageShell } from "@/components/public/page-shell";
import { Link } from "@/i18n/navigation";
import { getIndustries, getSidoRegions } from "@/lib/referenceData";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    locale,
    path: "/employer/signup",
    key: "employerSignup",
    noindex: true,
  });
}

/** R-123: employer sign-up. 업종·시·도 options come from the reference tables. */
export default async function EmployerSignupPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("employer.signup");
  const tr = await getTranslations();
  const [industries, sidos] = await Promise.all([getIndustries(), getSidoRegions()]);
  return (
    <PageShell eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} narrow>
      <div className="grid max-w-110 gap-6">
        <ScopedIntlProvider namespaces={["employer.signup", "errors"]}>
          <EmployerSignupForm
            industries={industries.map((i) => ({ code: i.code, label: tr(i.nameKey) }))}
            sidos={sidos.map((s) => ({ code: s.code, label: tr(s.nameKey) }))}
          />
        </ScopedIntlProvider>
        <p className="text-dense text-n700">
          {t("toLogin")}{" "}
          <Link
            href="/employer/login"
            className="inline-flex min-h-11 min-w-11 items-center font-semibold text-brand-blue-600 underline underline-offset-4"
          >
            {t("toLoginLink")}
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
