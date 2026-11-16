import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ComingSoon } from "@/components/common/coming-soon";
import { NoticeBox } from "@/components/legal/notice-box";
import { DemandActions } from "@/components/public/demand-actions";
import { loadDemandView } from "@/components/public/demand-view";
import { PageShell } from "@/components/public/page-shell";
import { isFeatureEnabled } from "@/config/flags";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: string }> };

// Flag and data are read on every request (WO §16, SC-07).
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  // SC-07: flag off → ComingSoon page with noindex. WO §13: /demand is indexable when on.
  return buildPageMetadata({
    locale,
    path: "/demand",
    key: "demand",
    noindex: !isFeatureEnabled("FEATURE_DEMAND_MAP"),
  });
}

/**
 * R-117 /demand (flag FEATURE_DEMAND_MAP). 시·도 × 업종 counts of the last 30 days and the pay median
 * band; cells under 5 show "자료 부족". The WO §8.4 notice is shown ABOVE the data in every
 * language, and the page has only the two WO §8.4 buttons (no "지원하기").
 */
export default async function DemandPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("public.demand");

  if (!isFeatureEnabled("FEATURE_DEMAND_MAP")) {
    return (
      <PageShell eyebrow={t("eyebrow")} title={t("title")}>
        <ComingSoon />
      </PageShell>
    );
  }

  const view = await loadDemandView();
  // With no cells at all, list every 시·도 as one row so the "자료 부족" state is explicit.
  const rows =
    view.rows.length > 0
      ? view.rows
      : view.nodes.map((n) => ({
          key: n.code,
          sido: n.label,
          industry: t("filter.any"),
          countText: n.countText,
          payText: n.payText,
          masked: !n.hasData,
        }));

  return (
    <PageShell eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")}>
      <div className="grid gap-8">
        <NoticeBox>{t("notice")}</NoticeBox>
        <p className="text-caption text-n500">
          {t("windowNote", {
            days: view.aggregate.windowDays,
            min: view.aggregate.minSample,
          })}
        </p>
        <DemandActions sidos={view.sidoOptions} industries={view.industryOptions} />

        <div className="overflow-x-auto rounded-md border border-border bg-white shadow-1">
          <table
            className="w-full min-w-140 border-collapse text-start text-dense"
            data-testid="demand-table"
          >
            <caption className="sr-only">{t("table.caption")}</caption>
            <thead className="bg-n50 text-label text-n700">
              <tr>
                <th scope="col" className="px-4 py-3 text-start">
                  {t("table.sido")}
                </th>
                <th scope="col" className="px-4 py-3 text-start">
                  {t("table.industry")}
                </th>
                <th scope="col" className="px-4 py-3 text-start">
                  {t("table.count")}
                </th>
                <th scope="col" className="px-4 py-3 text-start">
                  {t("table.pay")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-t border-n100" data-masked={row.masked}>
                  <th scope="row" className="px-4 py-3 text-start font-semibold text-navy">
                    {row.sido}
                  </th>
                  <td className="px-4 py-3 text-n700">{row.industry}</td>
                  <td
                    className={cn(
                      "px-4 py-3 tabular-nums",
                      row.masked ? "text-n500" : "font-semibold text-navy",
                    )}
                  >
                    {row.countText}
                  </td>
                  <td
                    className={cn("px-4 py-3 tabular-nums", row.masked ? "text-n500" : "text-navy")}
                  >
                    {row.payText}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.every((r) => r.masked) ? (
          <p className="text-caption text-n500">{t("table.empty")}</p>
        ) : null}
      </div>
    </PageShell>
  );
}
