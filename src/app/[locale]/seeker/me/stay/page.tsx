import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ScopedIntlProvider } from "@/components/common/scoped-intl-provider";
import { NoticeBox } from "@/components/legal/notice-box";
import { PageShell } from "@/components/public/page-shell";
import { StayForm } from "@/components/seeker/stay-form";
import { Button } from "@/components/ui/button";
import { STAY_ALERT_DAYS } from "@/config/limits";
import { Link, redirect } from "@/i18n/navigation";
import { getFormatter } from "next-intl/server";
import { dateToMonth } from "@/lib/seeker/options";
import { getSeekerOverview } from "@/lib/seeker/overview";
import { currentSeekerId } from "@/lib/seeker/session";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({ locale, path: "/seeker/me/stay", key: "seekerStay", noindex: true });
}

/** /[locale]/seeker/me/stay — 체류 만료 알림 설정 (WO §6.2, R-113). Reminders are sent in P2d. */
export default async function SeekerStayPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const userId = await currentSeekerId();
  if (!userId) redirect({ href: "/seeker/login?next=/seeker/me/stay", locale });
  const t = await getTranslations("seeker.stay");
  const format = await getFormatter();
  const o = await getSeekerOverview(userId as string, locale);
  const days = format.list(STAY_ALERT_DAYS.map((d) => t("dayBefore", { days: d })));

  return (
    <PageShell eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} narrow>
      <div className="grid max-w-140 gap-6" data-testid="seeker-stay">
        <NoticeBox>{t("notice", { days })}</NoticeBox>
        <ScopedIntlProvider namespaces={["seeker.stay", "seeker.register.common", "errors"]}>
          <StayForm
            values={{ stayExpiry: dateToMonth(o.stayExpiry), stayAlertOptIn: o.stayAlertOptIn }}
            nowYear={new Date().getUTCFullYear()}
          />
        </ScopedIntlProvider>
        <div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/seeker/me">{t("back")}</Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
