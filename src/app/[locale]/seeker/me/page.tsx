import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ScopedIntlProvider } from "@/components/common/scoped-intl-provider";
import { PageShell } from "@/components/public/page-shell";
import { ConsentManager } from "@/components/seeker/consent-manager";
import { GradeBadge } from "@/components/seeker/grade-badge";
import { NextActions, trackGuide } from "@/components/seeker/next-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { VisaLabel } from "@/components/visa/visa-label";
import { Link, redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { REGISTRATION_CONSENTS, WIZARD_LAST_STEP } from "@/lib/seeker/options";
import { getSeekerOverview } from "@/lib/seeker/overview";
import { currentSeekerId } from "@/lib/seeker/session";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({ locale, path: "/seeker/me", key: "seekerMe", noindex: true });
}

/** /[locale]/seeker/me — 프로필·등급·진행 현황, 동의 철회 (R-113). */
export default async function SeekerMePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const userId = await currentSeekerId();
  if (!userId) redirect({ href: "/seeker/login?next=/seeker/me", locale });
  const id = userId as string;
  const t = await getTranslations("seeker.me");
  const o = await getSeekerOverview(id, locale);
  const rows = await db.consent.findMany({
    where: { userId: id, type: { in: [...REGISTRATION_CONSENTS] } },
    orderBy: { agreedAt: "desc" },
    select: { type: true, agreedAt: true, revokedAt: true },
  });
  const consents = REGISTRATION_CONSENTS.map((type) => {
    const active = rows.find((r) => r.type === type && r.revokedAt === null);
    return { type, active: active != null, agreedAt: active?.agreedAt.toISOString() ?? null };
  });

  return (
    <PageShell eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")}>
      <div className="grid gap-6 lg:grid-cols-2" data-testid="seeker-me">
        <Card className="grid content-start gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-h3 text-navy">{t("gradeTitle")}</h2>
            <GradeBadge grade={o.grade} />
          </div>
          <p className="text-dense text-n700">{t("gradeHelp")}</p>
          {o.visa ? (
            <p className="text-dense text-n700">
              <span className="me-2 text-label text-n500">{t("visa")}</span>
              <VisaLabel
                code={o.visa.code}
                nameKey={o.visa.nameKey}
                showCode={o.visa.isStatusCode}
              />
            </p>
          ) : null}
        </Card>
        <Card className="grid content-start gap-4" data-testid="seeker-progress">
          <h2 className="text-h3 text-navy">{t("progressTitle")}</h2>
          <p className="text-dense text-n700" data-testid="seeker-progress-text">
            {o.completed
              ? t("progressDone")
              : t("progressCount", { step: o.completedStep, total: WIZARD_LAST_STEP })}
          </p>
          <Progress
            value={o.completedStep}
            max={WIZARD_LAST_STEP}
            aria-label={t("progressTitle")}
          />
          {!o.completed ? (
            <div>
              <Button asChild variant="seeker">
                <Link href="/seeker/register" data-testid="continue-registration">
                  {t("continue")}
                </Link>
              </Button>
            </div>
          ) : null}
        </Card>
        <Card className="grid content-start gap-4 lg:col-span-2">
          <h2 className="text-h3 text-navy">{t("nextTitle")}</h2>
          <NextActions
            guide={trackGuide(o.track, {
              autoConsult: o.autoConsult,
              needsVisaReview: o.needsVisaReview,
            })}
          />
          <div className="flex flex-wrap gap-2 border-t border-n200 pt-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/seeker/me/stay">{t("links.stay")}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/seeker/me/referral" data-testid="link-referral">
                {t("links.referral")}
              </Link>
            </Button>
          </div>
        </Card>
        <Card className="grid content-start gap-4 lg:col-span-2">
          <h2 className="text-h3 text-navy">{t("consents.title")}</h2>
          <p className="text-dense text-n700">{t("consents.lead")}</p>
          <ScopedIntlProvider namespaces={["seeker.me"]}>
            <ConsentManager items={consents} />
          </ScopedIntlProvider>
        </Card>
      </div>
    </PageShell>
  );
}
