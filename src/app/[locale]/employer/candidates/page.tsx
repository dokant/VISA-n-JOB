import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";

import { ComingSoon } from "@/components/common/coming-soon";
import { ScopedIntlProvider } from "@/components/common/scoped-intl-provider";
import { CandidateCard } from "@/components/employer/candidate-card";
import { CandidateFiltersForm } from "@/components/employer/candidate-filters";
import { CandidateStatsView } from "@/components/employer/candidate-stats";
import { loadCandidateReference, loadCandidateViews } from "@/components/employer/candidate-view";
import { InterviewRequestButton } from "@/components/employer/interview-request-button";
import { NoticeBox } from "@/components/legal/notice-box";
import { PageShell } from "@/components/public/page-shell";
import { isFeatureEnabled } from "@/config/flags";
import { CANDIDATE_VIEWS_PER_DAY } from "@/config/limits";
import { redirect } from "@/i18n/navigation";
import { candidateAccessOf } from "@/lib/candidates/access";
import { browseCandidates } from "@/lib/candidates/browse";
import { requestedPublicIds } from "@/lib/candidates/interest";
import { candidateStats } from "@/lib/candidates/stats";
import { currentEmployer } from "@/lib/employer/session";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { parseCandidateFilters } from "@/schemas/employer/candidates";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Flag, session and data are read on every request (WO §16, SC-07).
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  // R-130 / WO §13: never indexed (also disallowed in robots.txt and sent with X-Robots-Tag).
  return buildPageMetadata({
    locale,
    path: "/employer/candidates",
    key: "employerCandidates",
    noindex: true,
  });
}

/**
 * R-205 /employer/candidates (flag FEATURE_EMPLOYER_CANDIDATES; off → ComingSoon, SC-07).
 * - Verified + contracted company: the blind list (blindSeeker.ts only, BR-02), 8 filters, "면접 요청"
 *   (R-207). Each render counts one view against the daily cap and writes CANDIDATE_BULK_VIEW (PC-12).
 * - Any other signed-in company: the summary counts only (PC-11) and what is missing (R-218, R-208).
 * No contact, name or "지원하기" anywhere (BR-01, SC-06).
 */
export default async function EmployerCandidatesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("employer.candidates");

  if (!isFeatureEnabled("FEATURE_EMPLOYER_CANDIDATES")) {
    const tm = await getTranslations("meta.employerCandidates");
    return (
      <PageShell title={tm("title")} lead={tm("description")}>
        <ComingSoon />
      </PageShell>
    );
  }

  const employer = await currentEmployer();
  if (!employer) {
    redirect({ href: "/employer/login?next=/employer/candidates", locale });
    return null;
  }

  const access = await candidateAccessOf(employer.companyId);
  if (access.level !== "LIST") {
    return (
      <PageShell eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")}>
        <CandidateStatsView stats={await candidateStats()} access={access} />
      </PageShell>
    );
  }

  const filters = parseCandidateFilters(await searchParams);
  const [ref, result] = await Promise.all([
    loadCandidateReference(),
    browseCandidates({ actor: employer, filters }),
  ]);
  const format = await getFormatter();

  return (
    <PageShell eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")}>
      <div className="grid gap-8">
        <NoticeBox>{t("notice")}</NoticeBox>
        <CandidateFiltersForm
          values={"filters" in result ? result.filters : filters}
          visaOptions={ref.visaOptions}
          stayOptions={ref.stayOptions}
          industryOptions={ref.industryOptions}
        />
        {!result.ok ? (
          <section
            role="status"
            className="grid gap-2 rounded-md border border-n200 bg-n50 p-6"
            data-testid="candidates-limited"
          >
            <h2 className="text-h3 text-navy">{t("limited.title")}</h2>
            <p className="text-dense text-n700">
              {t("limited.body", { limit: CANDIDATE_VIEWS_PER_DAY })}
            </p>
          </section>
        ) : (
          <CandidateList
            candidates={await loadCandidateViews(result.candidates, ref)}
            requested={await requestedPublicIds(employer.companyId)}
            header={
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-dense font-semibold text-navy" data-testid="candidates-count">
                  {t("count", { count: format.number(result.candidates.length) })}
                </p>
                <p className="text-caption text-n500" data-testid="candidates-remaining">
                  {t("remaining", { count: format.number(result.remaining) })}
                </p>
              </div>
            }
          />
        )}
      </div>
    </PageShell>
  );
}

async function CandidateList({
  candidates,
  requested,
  header,
}: {
  candidates: Awaited<ReturnType<typeof loadCandidateViews>>;
  requested: Set<string>;
  header: ReactNode;
}) {
  const t = await getTranslations("employer.candidates");
  return (
    <section className="grid gap-4" aria-label={t("listLabel")}>
      {header}
      {candidates.length === 0 ? (
        <p className="text-dense text-n700" data-testid="candidates-empty">
          {t("empty")}
        </p>
      ) : (
        <ScopedIntlProvider namespaces={["employer.candidates.interview"]}>
          <ul className="grid gap-6 lg:grid-cols-2" data-testid="candidates-list">
            {candidates.map((c) => (
              <li key={c.publicId} className="grid">
                <CandidateCard
                  candidate={c}
                  action={
                    <InterviewRequestButton
                      publicId={c.publicId}
                      requested={requested.has(c.publicId)}
                    />
                  }
                />
              </li>
            ))}
          </ul>
        </ScopedIntlProvider>
      )}
    </section>
  );
}
