import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageShell } from "@/components/public/page-shell";
import { Link } from "@/i18n/navigation";
import { listGuideSlugs, loadGuideMeta } from "@/lib/guide";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({ locale, path: "/guide", key: "guide" });
}

/** R-131 비자 정보센터 index: the list of MDX guides. */
export default async function GuideIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("meta.guide");
  const guides = await Promise.all(
    listGuideSlugs().map(async (slug) => ({ slug, meta: await loadGuideMeta(slug, locale) })),
  );

  return (
    <PageShell title={t("title")} lead={t("description")}>
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {guides.map(({ slug, meta }) =>
          meta ? (
            <li key={slug}>
              <Link
                href={"/guide/" + slug}
                className="group grid h-full gap-3 rounded-md border border-border bg-white p-6 shadow-1 transition-[transform,box-shadow,border-color] duration-500 ease-out hover:-translate-y-1 hover:border-brand-blue/30 hover:shadow-2"
              >
                <h2 className="text-h3 text-navy">{meta.title}</h2>
                <p className="text-dense text-n500">{meta.description}</p>
                <ArrowRight
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className="size-4 text-navy transition-transform group-hover:translate-x-0.75"
                />
              </Link>
            </li>
          ) : null,
        )}
      </ul>
    </PageShell>
  );
}
