import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ScopedIntlProvider } from "@/components/common/scoped-intl-provider";
import { EmployerLoginForm } from "@/components/employer/employer-login-form";
import { PageShell } from "@/components/public/page-shell";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    locale,
    path: "/employer/login",
    key: "employerLogin",
    noindex: true,
  });
}

/** R-123: employer sign-in with e-mail + password. */
export default async function EmployerLoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { next } = await searchParams;
  const t = await getTranslations("employer.login");
  return (
    <PageShell eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} narrow>
      <div className="grid max-w-110 gap-6">
        <ScopedIntlProvider namespaces={["employer.login", "errors"]}>
          <EmployerLoginForm next={typeof next === "string" ? next : undefined} />
        </ScopedIntlProvider>
        <p className="text-dense text-n700">
          {t("toSignup")}{" "}
          <Link
            href="/employer/signup"
            className="inline-flex min-h-11 min-w-11 items-center font-semibold text-brand-blue-600 underline underline-offset-4"
          >
            {t("toSignupLink")}
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
