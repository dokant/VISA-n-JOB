import { getTranslations } from "next-intl/server";

import { CONSULT_HREF } from "@/components/common/coming-soon";
import { SectionHeader } from "@/components/common/section-header";

import { AUDIENCES, type Audience, type AudienceCopy } from "./audience";
import { AudienceSelectorClient } from "./audience-selector-client";

/**
 * STANDARD v2 3.7 #3 = R-101 ① 대상 선택 3버튼. Cards: 기업 / 구직자 / 협력 소개소 (C-15: the
 * agency card shows "준비 중" + 상담 신청). Handoff numbers, "6:4 배분", "풀 실시간 공유",
 * "10개 언어" and "지원 가능" phrases are removed (K-02, K-10, K-11, K-13).
 */
export async function AudienceSelector({ initial }: { initial?: string }) {
  const t = await getTranslations("public.home.audience");
  const start: Audience = AUDIENCES.includes(initial as Audience)
    ? (initial as Audience)
    : "employer";

  const card = (a: Audience) => ({
    tab: t(`${a}.tab`),
    num: t(`${a}.num`),
    kicker: t(`${a}.kicker`),
    title: t(`${a}.title`),
    subtitle: t(`${a}.subtitle`),
    desc: t(`${a}.desc`),
    action: t(`${a}.action`),
  });

  const copy: Record<Audience, AudienceCopy> = {
    employer: {
      ...card("employer"),
      panel: {
        title: t("employer.panel.title"),
        body: t("employer.panel.body"),
        bullets: [
          t("employer.panel.bullets.b1"),
          t("employer.panel.bullets.b2"),
          t("employer.panel.bullets.b3"),
        ],
        cta: { href: "/employer/diagnosis", label: t("employer.panel.cta"), variant: "default" },
        secondary: { href: "/employer/request", label: t("employer.panel.secondary") },
      },
    },
    seeker: {
      ...card("seeker"),
      panel: {
        title: t("seeker.panel.title"),
        body: t("seeker.panel.body"),
        bullets: [
          t("seeker.panel.bullets.b1"),
          t("seeker.panel.bullets.b2"),
          t("seeker.panel.bullets.b3"),
        ],
        cta: { href: "/seeker/register/quick", label: t("seeker.panel.cta"), variant: "seeker" },
        secondary: { href: "/visa-check", label: t("seeker.panel.secondary") },
      },
    },
    agency: {
      ...card("agency"),
      panel: {
        title: t("agency.panel.title"),
        body: t("agency.panel.body"),
        bullets: [],
        badge: t("agency.panel.badge"),
        cta: { href: CONSULT_HREF, label: t("agency.panel.cta"), variant: "default" },
      },
    },
  };

  return (
    <section
      id="audience"
      className="relative bg-white py-section"
      aria-labelledby="audience-title"
      data-testid="home-audience"
    >
      <div className="mx-auto max-w-site px-gutter">
        <AudienceSelectorClient
          header={
            <SectionHeader
              id="audience-title"
              eyebrow={t("eyebrow")}
              title={t("title")}
              lead={t("lead")}
            />
          }
          initial={start}
          tabsLabel={t("tabsLabel")}
          copy={copy}
        />
      </div>
    </section>
  );
}
