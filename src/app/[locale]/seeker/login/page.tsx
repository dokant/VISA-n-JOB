import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ScopedIntlProvider } from "@/components/common/scoped-intl-provider";
import { PageShell } from "@/components/public/page-shell";
import { SeekerLoginForm } from "@/components/seeker/seeker-login-form";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({ locale, path: "/seeker/login", key: "seekerLogin", noindex: true });
}

/** R-104: seeker sign-in with a phone OTP. Registration itself is P1c (/seeker/register). */
export default async function SeekerLoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { next } = await searchParams;
  const t = await getTranslations("seeker.login");
  return (
    <PageShell eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} narrow>
      <div className="max-w-110">
        <ScopedIntlProvider namespaces={["seeker.login", "errors"]}>
          <SeekerLoginForm next={typeof next === "string" ? next : undefined} />
        </ScopedIntlProvider>
      </div>
    </PageShell>
  );
}
