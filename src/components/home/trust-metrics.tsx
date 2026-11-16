import { ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { SectionHeader } from "@/components/common/section-header";
import { getSiteConfig } from "@/config/site.config";

import { CountUp } from "./count-up";

/**
 * STANDARD v2 3.7 #4 = R-101 ③ 실적 지표 (PC-7). Metric values come ONLY from site.config operator
 * input; with no metrics the metric row is not rendered and the section shows the license cards
 * (registration numbers) with a heading that makes no numeric claim. With neither metrics nor
 * registration numbers the whole section is not rendered.
 */
export async function TrustMetrics() {
  const t = await getTranslations("public.home.metrics");
  const site = getSiteConfig();
  const metrics = site.metrics;

  const licenses = [
    {
      key: "jobPlacement",
      title: t("license.jobPlacement"),
      regNo: site.jobPlacementAgency.jobPlacementRegNo,
    },
    {
      key: "adminOffice",
      title: site.adminScrivenerOffice.name || t("license.adminOffice"),
      regNo: site.adminScrivenerOffice.adminScrivenerRegNo,
    },
  ].filter((l) => l.regNo);

  if (metrics.length === 0 && licenses.length === 0) return null;

  return (
    <section
      className="vj-metrics relative overflow-hidden py-section-tight"
      aria-labelledby="metrics-title"
      data-testid="home-metrics"
    >
      <div className="relative mx-auto grid max-w-site gap-14 px-gutter">
        <div className="grid items-end gap-10 lg:grid-cols-2">
          <SectionHeader
            id="metrics-title"
            tone="dark"
            eyebrow={t("eyebrow")}
            title={metrics.length > 0 ? t("titleWithMetrics") : t("title")}
            lead={t("lead")}
          />
          <ul className="grid gap-3 lg:justify-self-end" data-testid="license-cards">
            {licenses.map((l) => (
              <li
                key={l.key}
                className="reveal flex items-center gap-3.5 rounded-md border border-white/16 bg-white/5 px-4.5 py-3.5"
              >
                <span className="vj-license-seal grid size-9.5 flex-none place-items-center rounded-full">
                  <ShieldCheck aria-hidden="true" strokeWidth={1.5} className="size-4.5" />
                </span>
                <span className="grid gap-0.5">
                  <strong className="text-meta font-semibold text-white">{l.title}</strong>
                  <span className="text-caption tracking-[0.04em] text-white/60">
                    {t("license.regNo", { regNo: l.regNo })}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {metrics.length > 0 ? (
          <dl
            className="grid grid-cols-2 border-t border-white/14 md:grid-cols-3 xl:grid-cols-5"
            data-testid="metrics-grid"
          >
            {metrics.map((m, index) => (
              <div
                key={m.key}
                className="reveal grid content-start gap-2 border-white/10 py-7 pe-6 not-last:border-e"
                style={{ transitionDelay: `${index * 0.06}s` }}
              >
                <dt className="text-caption text-white/60">{t(`items.${m.key}.label`)}</dt>
                <dd className="order-first text-metric text-white tabular-nums">
                  <CountUp value={m.value} />
                  {m.suffix ? (
                    <span className="vj-metric-suffix ms-0.5 align-super tracking-normal text-brand-cyan">
                      {m.suffix}
                    </span>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </section>
  );
}
