import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";

import { LocaleSwitcher } from "@/components/common/locale-switcher";

// Temporary home page (P0a). Replaced by the public home in P1a.
export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("public.home");

  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 md:px-6">
          <span className="text-lg leading-7 font-bold text-primary">{t("brand")}</span>
          <LocaleSwitcher />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
        <h1 className="text-2xl leading-8 font-bold md:text-3xl md:leading-9">{t("title")}</h1>
        <p className="mt-4 text-muted-foreground">{t("description")}</p>
      </main>
    </>
  );
}
