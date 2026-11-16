import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ComingSoon } from "@/components/common/coming-soon";
import { InterestPanel } from "@/components/jobs/interest-panel";
import { loadPostingViews } from "@/components/jobs/posting-view";
import { VerifiedBadge } from "@/components/jobs/verified-badge";
import { NoticeBox } from "@/components/legal/notice-box";
import { PageShell } from "@/components/public/page-shell";
import { VisaLabel } from "@/components/visa/visa-label";
import { isFeatureEnabled } from "@/config/flags";
import { Link } from "@/i18n/navigation";
import { interestStateFor } from "@/lib/postings/interest";
import { getPublicPosting } from "@/lib/postings/public";
import { currentSeekerId } from "@/lib/seeker/session";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ locale: string; id: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  return buildPageMetadata({
    locale,
    path: `/jobs/${id}`,
    key: "jobDetail",
    noindex: !isFeatureEnabled("FEATURE_PUBLIC_JOBS"),
  });
}

/**
 * R-202 / R-203 /jobs/[id] (flag FEATURE_PUBLIC_JOBS). One public posting (404 when it is not
 * public), the WO §8.5 facts, the "검증 완료" badge, the operator's 직업소개사업 등록번호, and the
 * 면접 신청 panel. No schema.org structured data for postings (WO §13).
 */
export default async function JobDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("public.jobs");

  if (!isFeatureEnabled("FEATURE_PUBLIC_JOBS")) {
    return (
      <PageShell eyebrow={t("eyebrow")} title={t("title")}>
        <ComingSoon />
      </PageShell>
    );
  }

  const posting = await getPublicPosting(id);
  if (!posting) notFound();
  const [view] = await loadPostingViews([posting]);
  const userId = await currentSeekerId();
  const state = userId
    ? await interestStateFor({
        userId,
        postingId: posting.id,
        eligibleVisas: posting.eligibleVisas,
      })
    : null;

  return (
    <PageShell eyebrow={t("eyebrow")} title={view.title} afterHeader={<VerifiedBadge />}>
      <div className="grid gap-8" data-testid="job-detail" data-posting-id={view.id}>
        <Link
          href="/jobs"
          className="inline-flex min-h-11 min-w-11 items-center justify-self-start text-dense text-n700 hover:text-navy"
        >
          ← {t("back")}
        </Link>
        <div className="grid gap-6 lg:grid-cols-5">
          <section
            aria-labelledby="job-facts-title"
            className="grid content-start gap-4 rounded-md border border-border bg-white p-6 shadow-1 lg:col-span-3"
          >
            <h2 id="job-facts-title" className="sr-only">
              {view.title}
            </h2>
            <dl className="divide-y divide-n100" data-testid="job-facts">
              {view.facts.map((f) => (
                <div key={f.key} className="grid gap-1 py-3 sm:grid-cols-3 sm:gap-2">
                  <dt className="text-dense text-n500">{f.label}</dt>
                  <dd className="text-dense break-words text-navy sm:col-span-2">{f.value}</dd>
                </div>
              ))}
              <div className="grid gap-1 py-3 sm:grid-cols-3 sm:gap-2">
                <dt className="text-dense text-n500">{t("facts.visas")}</dt>
                <dd className="sm:col-span-2">
                  <ul className="flex flex-wrap gap-2" data-testid="posting-visas">
                    {view.visas.map((v) => (
                      <li key={v.code} className="text-dense text-navy">
                        <VisaLabel code={v.code} nameKey={v.nameKey} showCode={v.isStatusCode} />
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
              {view.placementRegNo ? (
                <div className="grid gap-1 py-3 sm:grid-cols-3 sm:gap-2">
                  <dt className="text-dense text-n500">{t("facts.placementRegNo")}</dt>
                  <dd className="text-dense text-navy sm:col-span-2" data-testid="placement-reg-no">
                    {view.placementRegNo}
                  </dd>
                </div>
              ) : null}
            </dl>
            <p className="text-caption text-n500">{t("blindNote")}</p>
          </section>
          <div className="grid content-start gap-4 lg:col-span-2">
            <InterestPanel postingId={view.id} state={state} />
            <NoticeBox>{t("operatorNote")}</NoticeBox>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
