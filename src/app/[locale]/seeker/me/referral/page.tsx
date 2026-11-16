import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ScopedIntlProvider } from "@/components/common/scoped-intl-provider";
import { PageShell } from "@/components/public/page-shell";
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
    path: "/seeker/me/referral",
    key: "seekerReferral",
    noindex: true,
  });
}

/**
 * /[locale]/seeker/me/referral — 내 추천 코드 (R-113, R-111). Shows how many people registered with
 * the code (DB count). Rewards are behind FEATURE_REFERRAL_REWARD and not part of this page.
 */
export default async function SeekerReferralPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const userId = await currentSeekerId();
  if (!userId) redirect({ href: "/seeker/login?next=/seeker/me/referral", locale });
  const t = await getTranslations("seeker.referral");
  const o = await getSeekerOverview(userId as string, locale);

  return (
    <PageShell eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} narrow>
      <div className="grid max-w-140 gap-6" data-testid="seeker-referral">
        <Card className="grid gap-4">
          <ScopedIntlProvider namespaces={["seeker.referral"]}>
            <ReferralShare code={o.referralCode} shareUrl={o.shareUrl} />
          </ScopedIntlProvider>
          <p className="text-dense text-n700" data-testid="referral-count">
            {t("count", { count: o.referralCount })}
          </p>
        </Card>
        <div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/seeker/me">{t("back")}</Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
