import { ArrowRight, CalendarCheck, CalendarClock, CalendarX } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ComingSoon } from "@/components/common/coming-soon";
import { PostingCard } from "@/components/jobs/posting-card";
import { loadPostingViews } from "@/components/jobs/posting-view";
import { NoticeBox } from "@/components/legal/notice-box";
import { PageShell } from "@/components/public/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isFeatureEnabled } from "@/config/flags";
import { formatDate, formatDateTime } from "@/i18n/dateTime";
import { Link, redirect } from "@/i18n/navigation";
import { getIndustries, getSidoRegions } from "@/lib/referenceData";
import { ownRecommendations, recommendedPostingsFor } from "@/lib/seeker/recommended";
import { currentSeekerId } from "@/lib/seeker/session";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    locale,
    path: "/seeker/me/recommended",
    key: "seekerRecommended",
    noindex: true,
  });
}

const STATUS_ICON = {
  SCHEDULED: CalendarClock,
  CONFIRMED: CalendarCheck,
  CANCELLED: CalendarX,
} as const;
const STATUS_VARIANT = { SCHEDULED: "orange", CONFIRMED: "blue", CANCELLED: "neutral" } as const;

/**
 * /[locale]/seeker/me/recommended — 추천 일자리 (R-212, PC-13).
 * 1. 나에게 맞는 일자리: public postings matching visa · region · industry (src/lib/seeker/recommended.ts).
 *    FEATURE_PUBLIC_JOBS off → this part is ComingSoon (SC-07: postings are not public yet).
 * 2. 비자앤잡이 나를 추천한 건: the seeker's own recommendation records — shown with the flag off too
 *    (own records, not public postings). Industry · 시·도 · dates only; no company name, address or
 *    contact (BR-03). The posting link appears only when the posting is public and the flag is on.
 */
export default async function SeekerRecommendedPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const userId = await currentSeekerId();
  if (!userId) {
    redirect({ href: "/seeker/login?next=/seeker/me/recommended", locale });
    return null;
  }
  const t = await getTranslations("seeker.recommended");
  const tAll = await getTranslations();
  const publicJobs = isFeatureEnabled("FEATURE_PUBLIC_JOBS");

  const [postings, mine, sidos, industries] = await Promise.all([
    publicJobs ? recommendedPostingsFor(userId) : Promise.resolve(null),
    ownRecommendations(userId),
    getSidoRegions(),
    getIndustries(),
  ]);
  const postingViews = postings ? await loadPostingViews(postings) : [];
  const sidoName = new Map(sidos.map((s) => [s.code, tAll(s.nameKey)]));
  const industryName = new Map(industries.map((i) => [i.code, tAll(i.nameKey)]));
  const day = (d: Date) => formatDate(locale, d);
  const when = (d: Date) => formatDateTime(locale, d);

  return (
    <PageShell eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")}>
      <div className="grid gap-10" data-testid="seeker-recommended">
        <section className="grid gap-4" aria-labelledby="recommended-postings">
          <h2 id="recommended-postings" className="text-h3 text-navy">
            {t("postingsTitle")}
          </h2>
          {!publicJobs ? (
            <ComingSoon description={t("description")} />
          ) : postings === null ? (
            <div
              className="grid justify-items-start gap-4"
              data-testid="recommended-profile-needed"
            >
              <p className="text-dense text-n700">{t("profileNeeded")}</p>
              <Button asChild variant="seeker">
                <Link href="/seeker/register">
                  {tAll("seeker.me.continue")}
                  <ArrowRight aria-hidden="true" strokeWidth={1.5} data-icon="trailing" />
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <NoticeBox>{t("postingsNote")}</NoticeBox>
              {postingViews.length === 0 ? (
                <p className="text-dense text-n700" data-testid="recommended-postings-empty">
                  {t("postingsEmpty")}
                </p>
              ) : (
                <ul
                  aria-label={t("postingsListLabel")}
                  className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                  data-testid="recommended-postings"
                >
                  {postingViews.map((p) => (
                    <li key={p.id} className="grid">
                      <PostingCard posting={p} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>

        <section className="grid gap-4" aria-labelledby="recommended-mine">
          <h2 id="recommended-mine" className="text-h3 text-navy">
            {t("mineTitle")}
          </h2>
          <p className="text-dense text-n700">{t("mineLead")}</p>
          {mine.length === 0 ? (
            <p className="text-dense text-n500" data-testid="recommended-mine-empty">
              {t("mineEmpty")}
            </p>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2" data-testid="recommended-mine">
              {mine.map((r, i) => (
                <li key={`${r.recommendedAt.toISOString()}-${i}`} className="grid">
                  <Card className="grid content-start gap-3" data-testid="recommended-mine-item">
                    <p className="text-body font-semibold text-navy">
                      {t("mineItem", {
                        industry: industryName.get(r.industryCode) ?? r.industryCode,
                        region: sidoName.get(r.sido) ?? r.sido,
                      })}
                    </p>
                    <p className="text-dense text-n700">
                      {t("recommendedAt", { date: day(r.recommendedAt) })}
                    </p>
                    {r.interviews.length > 0 ? (
                      <ul className="grid gap-2">
                        {r.interviews.map((iv, j) => {
                          const Icon = STATUS_ICON[iv.status];
                          return (
                            <li key={j} className="flex flex-wrap items-center gap-2 text-dense">
                              <span className="text-navy">
                                {t("interviewAt", { date: when(iv.scheduledAt) })}
                              </span>
                              <Badge variant={STATUS_VARIANT[iv.status]}>
                                <Icon aria-hidden="true" strokeWidth={1.5} />
                                {t(`interviewStatus.${iv.status}`)}
                              </Badge>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                    {publicJobs && r.publicPostingId ? (
                      <div>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/jobs/${r.publicPostingId}`}>{t("viewPosting")}</Link>
                        </Button>
                      </div>
                    ) : null}
                  </Card>
                </li>
              ))}
            </ul>
          )}
          <p className="text-caption text-n500">{t("consentHint")}</p>
          <div>
            <Button asChild variant="outline" size="sm">
              <Link href="/seeker/me">{t("toMe")}</Link>
            </Button>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
