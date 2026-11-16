import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";

import { getSiteConfig } from "@/config/site.config";
import { routing } from "@/i18n/routing";
import { ZhFontLoader } from "@/components/common/zh-font-loader";
import { inter, notoSansKR } from "@/lib/fonts";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

/**
 * Message namespaces that client components read (LocaleSwitcher, SiteNav, AudienceSelector,
 * VisaCheckForm / OutcomeCard / VisaLabel, ScoreForm / ScoreResult). Everything else stays on the
 * server so the page payload stays small (R-103).
 */
const CLIENT_NAMESPACES = ["common", "nav", "visa", "visaType"] as const;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(getSiteConfig().siteUrl),
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

  const messages = await getMessages();
  const clientMessages = Object.fromEntries(
    CLIENT_NAMESPACES.filter((ns) => ns in messages).map((ns) => [ns, messages[ns]]),
  );
  const t = await getTranslations("common");

  // STANDARD 2.3.2/2.3.3: the stack order per locale is set in globals.css (html:lang(..)).
  // Noto Sans SC is attached only for zh, lazily (ZhFontLoader).
  const fontClasses = `${notoSansKR.variable} ${inter.variable}`;

  return (
    <html lang={locale} className={fontClasses}>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="fixed start-4 top-4 z-60 -translate-y-24 rounded-full bg-navy px-5 py-3 text-ui text-white transition-transform focus-visible:translate-y-0"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider messages={clientMessages}>{children}</NextIntlClientProvider>
        {locale === "zh" ? <ZhFontLoader /> : null}
      </body>
    </html>
  );
}
