import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";

import { LocaleSwitcher } from "@/components/common/locale-switcher";
import { Logo } from "@/components/common/logo";

// Temporary home page (P0a). Shows the v2 tokens, fonts and brand components only.
// Replaced by the public home (SiteNav, home sections, SiteFooter) in P1a.
export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("public.home");

  return (
    <>
      <header className="border-b border-navy/8 bg-white">
        <div className="mx-auto flex h-16 max-w-site items-center justify-between gap-4 px-gutter md:h-19">
          <Logo />
          <LocaleSwitcher />
        </div>
      </header>
      <main>
        <section className="mx-auto max-w-site px-gutter py-section-tight">
          <h1 className="max-w-3xl text-h1 text-navy">{t("title")}</h1>
          <p className="mt-4 max-w-2xl text-lead text-muted-foreground">{t("description")}</p>
        </section>
        <section className="vj-surface-footer" aria-hidden="true">
          <div className="mx-auto max-w-site px-gutter py-10">
            <Logo tone="dark" />
          </div>
        </section>
      </main>
    </>
  );
}
