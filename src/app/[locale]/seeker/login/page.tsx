import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ScopedIntlProvider } from "@/components/common/scoped-intl-provider";
import { PageShell } from "@/components/public/page-shell";
import { SeekerLoginForm } from "@/components/seeker/seeker-login-form";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({ locale, path: "/seeker/login", key: "seekerLogin", noindex: true });
}

/** R-104: seeker sign-in with a phone OTP. No account yet → 간편 등록 first (R-105). */
export default async function SeekerLoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { next } = await searchParams;
  const t = await getTranslations("seeker.login");
  return (
    <PageShell eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} narrow>
      <div className="grid max-w-110 gap-6">
        <ScopedIntlProvider namespaces={["seeker.login", "errors"]}>
          <SeekerLoginForm next={typeof next === "string" ? next : undefined} />
        </ScopedIntlProvider>
        <div className="grid gap-2 border-t border-n200 pt-5" data-testid="register-first">
          <p className="text-dense text-n700">{t("registerFirst")}</p>
          <div>
            <Button asChild variant="outline" size="sm">
              <Link href="/seeker/register/quick">{t("quickRegister")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
