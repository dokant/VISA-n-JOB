import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ExpertReviewMark } from "@/components/legal/expert-review-mark";
import { PageShell } from "@/components/public/page-shell";
import { formatDate } from "@/i18n/dateTime";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { listGuideSlugs, loadGuide } from "@/lib/guide";
import { JsonLd, breadcrumbJsonLd, faqPageJsonLd } from "@/lib/seo/jsonld";
import { languageAlternates, localizedPath } from "@/lib/seo/metadata";

type Props = { params: Promise<{ locale: string; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => listGuideSlugs().map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const guide = await loadGuide(slug, locale);
  if (!guide) return {};
  const path = `/guide/${slug}`;
  return {
    title: guide.frontmatter.title,
    description: guide.frontmatter.description,
    alternates: { canonical: localizedPath(locale, path), languages: languageAlternates(path) },
  };
}

/**
 * R-131 /guide/[slug]: MDX guide with reviewedBy and updatedAt shown, FAQPage + BreadcrumbList
 * JSON-LD. The sample guide explains how to use the service only (no legal content, BR-12) and is
 * marked [전문가 검토 필요] until a 행정사 reviews it.
 */
export default async function GuidePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const guide = await loadGuide(slug, locale);
  if (!guide) notFound();

  const t = await getTranslations("public.guide");
  const fm = guide.frontmatter;
  const updated = formatDate(locale, new Date(fm.updatedAt + "T00:00:00+09:00"), {
    dateStyle: "long",
  });

  return (
    <PageShell
      title={fm.title}
      lead={fm.description}
      narrow
      afterHeader={
        <div className="grid gap-3">
          <nav aria-label={t("breadcrumbGuide")} className="text-caption text-n500">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href="/" className="hover:text-navy hover:underline">
                  {t("breadcrumbHome")}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/guide" className="hover:text-navy hover:underline">
                  {t("breadcrumbGuide")}
                </Link>
              </li>
            </ol>
          </nav>
          <dl
            className="flex flex-wrap gap-x-5 gap-y-1 text-caption text-n700"
            data-testid="guide-meta"
          >
            <div className="flex gap-1.5">
              <dt className="font-semibold">{t("reviewedBy")}</dt>
              <dd>{fm.reviewedBy}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="font-semibold">{t("updatedAt")}</dt>
              <dd>
                <time dateTime={fm.updatedAt}>{updated}</time>
              </dd>
            </div>
          </dl>
          <ExpertReviewMark />
        </div>
      }
    >
      <article className="vj-prose grid gap-4 text-body text-n700" data-testid="guide-body">
        {guide.content}
      </article>
      {fm.faq.length > 0 ? (
        <section aria-labelledby="guide-faq" className="mt-14 grid gap-2">
          <h2 id="guide-faq" className="text-h2 text-navy">
            {t("faqTitle")}
          </h2>
          <dl className="divide-y divide-n200 border-y border-n200">
            {fm.faq.map((item) => (
              <div key={item.q} className="grid gap-2 py-4.5">
                <dt className="text-body font-semibold text-navy">{item.q}</dt>
                <dd className="text-dense text-n700">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
      <JsonLd data={faqPageJsonLd(fm.faq.map((i) => ({ question: i.q, answer: i.a })))} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t("breadcrumbHome"), path: localizedPath(locale, "/") },
          { name: t("breadcrumbGuide"), path: localizedPath(locale, "/guide") },
          { name: fm.title, path: localizedPath(locale, "/guide/" + slug) },
        ])}
      />
    </PageShell>
  );
}
