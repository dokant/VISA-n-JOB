import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ScopedIntlProvider } from "@/components/common/scoped-intl-provider";
import { NoticeBox } from "@/components/legal/notice-box";
import { PageShell } from "@/components/public/page-shell";
import { GradeBadge } from "@/components/seeker/grade-badge";
import { NextActions, trackGuide } from "@/components/seeker/next-actions";
import { ReferralShare } from "@/components/seeker/referral-share";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link, redirect } from "@/i18n/navigation";
import { getSeekerOverview } from "@/lib/seeker/overview";
import { currentSeekerId } from "@/lib/seeker/session";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    locale,
    path: "/seeker/register/complete",
    key: "seekerComplete",
    noindex: true,
  });
}

/**
 * 완료 화면 (R-112, WO §7.3): 현재 등급 B + 등급을 올리는 방법, 내 추천 코드와 메신저별 공유,
 * 트랙에 맞는 다음 행동 버튼.
 */
export default async function RegisterCompletePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const userId = await currentSeekerId();
  if (!userId) redirect({ href: "/seeker/login?next=/seeker/register/complete", locale });
  const o = await getSeekerOverview(userId as string, locale);
  const t = await getTranslations("seeker.complete");

  return (
    <PageShell eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} narrow>
      <div className="grid gap-6" data-testid="register-complete">
        <Card className="grid gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-h3 text-navy">{t("gradeTitle")}</h2>
            <GradeBadge grade={o.grade} />
          </div>
          <p className="text-dense text-n700" data-testid="grade-upgrade">
            {t("upgrade")}
          </p>
          {!o.completed ? (
            <div className="grid gap-2 border-t border-n200 pt-3">
              <p className="text-dense text-n700">{t("completeProfile")}</p>
              <div>
                <Button asChild variant="seeker">
                  <Link href="/seeker/register" data-testid="complete-profile">
                    {t("completeProfileCta")}
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
        <Card className="grid gap-4">
          <h2 className="text-h3 text-navy">{t("nextTitle")}</h2>
          <NextActions
            guide={trackGuide(o.track, {
              autoConsult: o.autoConsult,
              needsVisaReview: o.needsVisaReview,
            })}
          />
        </Card>
        <Card className="grid gap-4">
          <h2 className="text-h3 text-navy">{t("referralTitle")}</h2>
          <p className="text-dense text-n700">{t("referralLead")}</p>
          <ScopedIntlProvider namespaces={["seeker.referral"]}>
            <ReferralShare code={o.referralCode} shareUrl={o.shareUrl} />
          </ScopedIntlProvider>
        </Card>
        <NoticeBox>
          <strong className="me-1 font-semibold text-navy" data-testid="no-seeker-fee">
            {t("noSeekerFee")}
          </strong>
          {t("contactNotice")}
        </NoticeBox>
        <div>
          <Button asChild variant="outline">
            <Link href="/seeker/me">{t("toMyPage")}</Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
