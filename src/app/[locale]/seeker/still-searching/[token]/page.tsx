import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ScopedIntlProvider } from "@/components/common/scoped-intl-provider";
import { PageShell } from "@/components/public/page-shell";
import { StillSearchingForm } from "@/components/seeker/still-searching-form";
import { StillSearchingNotice } from "@/components/seeker/still-searching-notice";
import { stillSearchingState } from "@/lib/seeker/stillSearching";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ locale: string; token: string }> };

// The token is checked against the database on every request.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    locale,
    path: "/seeker/still-searching",
    key: "seekerStillSearching",
    noindex: true,
  });
}

/**
 * /[locale]/seeker/still-searching/[token] — "아직 구직 중이세요?" 원클릭 응답 (R-213, WO §7.7).
 * No sign-in: the signed token from the 30-day status-check message identifies one open check
 * (src/lib/seeker/stillSearching.ts). Opening the page changes nothing (mail scanners open links);
 * the seeker presses one button. Nothing personal is shown — the page does not even say whose check
 * it is.
 */
export default async function StillSearchingPage({ params }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("seeker.stillSearching");
  const state = await stillSearchingState(decodeURIComponent(token));

  return (
    <PageShell eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} narrow>
      <div className="grid max-w-140 gap-6" data-testid="still-searching" data-state={state}>
        {state === "ASK" ? (
          <ScopedIntlProvider namespaces={["seeker.stillSearching"]}>
            <StillSearchingForm token={decodeURIComponent(token)} />
          </ScopedIntlProvider>
        ) : state === "ANSWERED" ? (
          <StillSearchingNotice
            kind="answered"
            title={t("answered.title")}
            body={t("answered.body")}
          />
        ) : (
          <StillSearchingNotice
            kind={state === "EXPIRED" ? "expired" : "invalid"}
            title={t(state === "EXPIRED" ? "expired.title" : "invalid.title")}
            body={t(state === "EXPIRED" ? "expired.body" : "invalid.body")}
            consultLabel={t("consult")}
          />
        )}
      </div>
    </PageShell>
  );
}
