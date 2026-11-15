import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { inter, notoSansSC, pretendard } from "@/lib/fonts";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: { default: t("home.title"), template: `%s | ${t("siteName")}` },
    description: t("home.description"),
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  // STANDARD 2.3.2/2.3.3: the stack order per locale is set in globals.css (html:lang(..)).
  // Noto Sans SC is attached only for zh.
  const fontClasses = [
    pretendard.variable,
    inter.variable,
    locale === "zh" ? notoSansSC.variable : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <html lang={locale} className={fontClasses}>
      <body className="min-h-dvh">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
