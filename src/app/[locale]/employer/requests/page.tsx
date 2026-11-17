import { CalendarCheck, CalendarClock, CalendarX, CircleDashed, UserCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { NoticeBox } from "@/components/legal/notice-box";
import { PageShell } from "@/components/public/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isFeatureEnabled } from "@/config/flags";
import { formatDate, formatDateTime } from "@/i18n/dateTime";
import { Link, redirect } from "@/i18n/navigation";
import { loadEmployerRequests } from "@/lib/employer/interviews";
import { currentEmployer } from "@/lib/employer/session";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ locale: string }> };

// Session and data are read on every request (consent revocation must show at once).
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    locale,
    path: "/employer/requests",
    key: "employerRequests",
    noindex: true,
  });
}

/** ENDED: a confirmed interview with a final result recorded (Q-25, P2c QA O-2) — "면접 종료". */
const STATUS_ICON = {
  SCHEDULED: CalendarClock,
  CONFIRMED: CalendarCheck,
  ENDED: CalendarX,
  CANCELLED: CalendarX,
} as const;
const STATUS_VARIANT = {
  SCHEDULED: "orange",
  CONFIRMED: "blue",
  ENDED: "neutral",
  CANCELLED: "neutral",
} as const;
const INTEREST_STATUSES = ["RECEIVED", "RECOMMENDED"] as const;

/**
 * /[locale]/employer/requests — 면접 요청 현황 (R-212, R-211).
 * Blind ids and statuses only (blindSeeker `toBlindPublicId`). Inside a confirmed interview of this
 * company whose seeker gave THIRD_PARTY_INTERVIEW consent, the real name — and nothing else — from
 * serializers/interviewDisclosure.ts (PC-1). No contact, no "지원하기", no way to reach the seeker
 * (BR-01): the place and time come from VISA n JOB.
 */
export default async function EmployerRequestsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const employer = await currentEmployer();
  if (!employer) {
    redirect({ href: "/employer/login?next=/employer/requests", locale });
    return null;
  }
  const t = await getTranslations("employer.requests");
  const data = await loadEmployerRequests(employer);
  const day = (iso: string) => formatDate(locale, new Date(iso));
  const when = (iso: string) => formatDateTime(locale, new Date(iso));
  // Same short label as the candidate card (candidate-view.ts), so the two screens match.
  const shortId = (id: string) => id.slice(0, 6).toUpperCase();

  return (
    <PageShell eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")}>
      <div className="grid gap-10" data-testid="employer-requests">
        <NoticeBox>
          {t("notice")} {t("nameNotice")}
        </NoticeBox>

        <section className="grid gap-4" aria-labelledby="requests-recommended">
          <h2 id="requests-recommended" className="text-h3 text-navy">
            {t("recTitle")}
          </h2>
          {data.recommendations.length === 0 ? (
            <p className="text-dense text-n500" data-testid="requests-rec-empty">
              {t("recEmpty")}
            </p>
          ) : (
            <ul className="grid gap-6 lg:grid-cols-2" data-testid="requests-recommendations">
              {data.recommendations.map((r) => (
                <li key={`${r.publicId}-${r.recommendedAt}`} className="grid">
                  <Card
                    className="grid content-start gap-4"
                    data-testid="requests-rec-item"
                    data-public-id={r.publicId}
                  >
                    <div className="grid gap-1">
                      <h3 className="text-body font-semibold text-navy">
                        {t("candidate", { id: shortId(r.publicId) })}
                      </h3>
                      <p className="text-dense text-n700">
                        {r.postingTitle
                          ? t("recommendedAtWithPosting", {
                              date: day(r.recommendedAt),
                              title: r.postingTitle,
                            })
                          : t("recommendedAt", { date: day(r.recommendedAt) })}
                      </p>
                    </div>
                    {r.interviews.length === 0 ? (
                      <p className="text-dense text-n500">{t("interviews.none")}</p>
                    ) : (
                      <ul className="grid gap-3">
                        {r.interviews.map((iv) => {
                          const shown =
                            iv.status === "CONFIRMED" && iv.nameState === "ENDED"
                              ? "ENDED"
                              : iv.status;
                          const Icon = STATUS_ICON[shown];
                          return (
                            <li
                              key={iv.interviewId}
                              className="grid gap-2 rounded-md border border-n200 bg-n50 p-4"
                              data-testid="requests-interview"
                              data-interview-id={iv.interviewId}
                              data-name-state={iv.nameState}
                              data-status={shown}
                            >
                              <dl className="grid gap-2 text-dense">
                                <div className="flex flex-wrap gap-x-2">
                                  <dt className="text-n500">{t("interviews.state")}</dt>
                                  <dd>
                                    <Badge variant={STATUS_VARIANT[shown]}>
                                      <Icon aria-hidden="true" strokeWidth={1.5} />
                                      {t(`interviews.status.${shown}`)}
                                    </Badge>
                                  </dd>
                                </div>
                                <div className="flex flex-wrap gap-x-2">
                                  <dt className="text-n500">{t("interviews.date")}</dt>
                                  <dd className="text-navy">{when(iv.scheduledAt)}</dd>
                                </div>
                                <div className="flex flex-wrap gap-x-2">
                                  <dt className="text-n500">{t("interviews.place")}</dt>
                                  <dd className="break-words text-navy">{iv.place}</dd>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-2">
                                  <dt className="text-n500">{t("interviews.name")}</dt>
                                  <dd className="flex flex-wrap items-center gap-2">
                                    {iv.disclosure ? (
                                      <>
                                        <span
                                          className="font-semibold text-navy"
                                          data-testid="requests-disclosed-name"
                                        >
                                          {iv.disclosure.legalName}
                                        </span>
                                        <Badge variant="cyan">
                                          <UserCheck aria-hidden="true" strokeWidth={1.5} />
                                          {t("interviews.nameState.GIVEN")}
                                        </Badge>
                                      </>
                                    ) : iv.nameState === "ENDED" ? (
                                      <span
                                        className="flex items-center gap-1.5 text-n700"
                                        data-testid="requests-name-ended"
                                      >
                                        <CalendarX
                                          aria-hidden="true"
                                          strokeWidth={1.5}
                                          className="size-4"
                                        />
                                        {t("interviews.nameState.ENDED")}
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1.5 text-n700">
                                        <CircleDashed
                                          aria-hidden="true"
                                          strokeWidth={1.5}
                                          className="size-4"
                                        />
                                        {t(`interviews.nameState.${iv.nameState}`)}
                                      </span>
                                    )}
                                  </dd>
                                </div>
                              </dl>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid gap-4" aria-labelledby="requests-interest">
          <h2 id="requests-interest" className="text-h3 text-navy">
            {t("interestTitle")}
          </h2>
          {data.interestRequests.length === 0 ? (
            <p className="text-dense text-n500" data-testid="requests-interest-empty">
              {t("interestEmpty")}
            </p>
          ) : (
            <ul className="grid gap-3" data-testid="requests-interest">
              {data.interestRequests.map((r) => {
                const status = (INTEREST_STATUSES as readonly string[]).includes(r.status)
                  ? (r.status as (typeof INTEREST_STATUSES)[number])
                  : "OTHER";
                return (
                  <li
                    key={`${r.publicId}-${r.requestedAt}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-n200 bg-white p-4"
                    data-testid="requests-interest-item"
                    data-public-id={r.publicId}
                  >
                    <div className="grid gap-1">
                      <p className="text-body font-semibold text-navy">
                        {t("candidate", { id: shortId(r.publicId) })}
                      </p>
                      <p className="text-caption text-n500">
                        {t("requestedAt", { date: day(r.requestedAt) })}
                      </p>
                    </div>
                    <Badge variant={status === "RECOMMENDED" ? "blue" : "orange"}>
                      <CircleDashed aria-hidden="true" strokeWidth={1.5} />
                      {t(`status.${status}`)}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
          {isFeatureEnabled("FEATURE_EMPLOYER_CANDIDATES") ? (
            <div>
              <Button asChild variant="outline" size="sm">
                <Link href="/employer/candidates">{t("toCandidates")}</Link>
              </Button>
            </div>
          ) : null}
        </section>
      </div>
    </PageShell>
  );
}
