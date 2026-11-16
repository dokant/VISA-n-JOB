import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { SectionHeader } from "@/components/common/section-header";
import { NoticeBox } from "@/components/legal/notice-box";
import { DemandActions } from "@/components/public/demand-actions";
import { DemandMap } from "@/components/public/demand-map";
import { loadDemandView } from "@/components/public/demand-view";
import { Link } from "@/i18n/navigation";

/**
 * STANDARD v2 3.7 #8 = R-101 ④ 수요 지도 미리보기 (flag FEATURE_DEMAND_MAP; the page does not render
 * this section when the flag is off). Dark map section: 시·도 nodes with 30-day counts and pay band,
 * "자료 부족" under 5 (R-117), the WO §8.4 notice ABOVE the map, and only the two WO §8.4 buttons.
 * Hub, partner counts, "진행 중 공고" and "지역 협력기관 되기" are removed (K-02, K-06).
 */
export async function DemandPreview() {
  const t = await getTranslations("public");
  const view = await loadDemandView();

  return (
    <section
      className="vj-surface-map vj-net relative overflow-hidden py-section"
      aria-labelledby="demand-preview-title"
      data-testid="home-demand-preview"
    >
      <div className="relative mx-auto grid max-w-site items-center gap-14 px-gutter lg:grid-cols-2">
        <div className="grid content-start gap-6">
          <SectionHeader
            id="demand-preview-title"
            tone="dark"
            eyebrow={t("home.demandPreview.eyebrow")}
            title={t("home.demandPreview.title")}
            lead={t("home.demandPreview.lead")}
          />
          <DemandActions tone="dark" sidos={view.sidoOptions} industries={view.industryOptions} />
          <Link
            href="/demand"
            className="inline-flex min-h-11 w-fit items-center gap-2 text-dense font-semibold text-white/86 hover:text-white"
          >
            {t("home.demandPreview.more")}
            <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-4" />
          </Link>
        </div>
        <div className="reveal grid gap-6">
          <NoticeBox tone="dark">{t("demand.notice")}</NoticeBox>
          <DemandMap
            title={t("home.demandPreview.mapLabel")}
            rowCountLabel={t("demand.table.count")}
            rowPayLabel={t("demand.table.pay")}
            nodes={view.nodes}
          />
        </div>
      </div>
    </section>
  );
}
