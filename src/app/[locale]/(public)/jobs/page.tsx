import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ComingSoon } from "@/components/common/coming-soon";
import { PostingCard } from "@/components/jobs/posting-card";
import { loadPostingViews } from "@/components/jobs/posting-view";
import { NoticeBox } from "@/components/legal/notice-box";
import { PageShell } from "@/components/public/page-shell";
import { Button } from "@/components/ui/button";
import { isFeatureEnabled } from "@/config/flags";
import { Link } from "@/i18n/navigation";
import { listPublicPostings } from "@/lib/postings/public";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ locale: string }> };

// Flag and data are read on every request (WO §16, SC-07).
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  // SC-07: flag off → ComingSoon page with noindex.
  return buildPageMetadata({
    locale,
    path: "/jobs",
    key: "jobs",
    noindex: !isFeatureEnabled("FEATURE_PUBLIC_JOBS"),
  });
}

/**
 * R-202 /jobs (flag FEATURE_PUBLIC_JOBS). PUBLISHED + verified postings of grade-A leads only
 * (src/lib/postings/public.ts), WO §8.5 values only (publicPosting.ts). No schema.org structured
 * data for postings (WO §13). The page says that 면접 신청 goes to VISA n JOB, not to the company.
 */
export default async function JobsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("public.jobs");

  if (!isFeatureEnabled("FEATURE_PUBLIC_JOBS")) {
    return (
      <PageShell eyebrow={t("eyebrow")} title={t("title")}>
        <ComingSoon />
      </PageShell>
    );
  }

  const postings = await loadPostingViews(await listPublicPostings());

  return (
    <PageShell eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")}>
      <div className="grid gap-8">
        <NoticeBox>
          {t("operatorNote")} {t("blindNote")}
        </NoticeBox>
        {postings.length === 0 ? (
          <div className="grid justify-items-start gap-4" data-testid="jobs-empty">
            <p className="text-dense text-n700">{t("empty")}</p>
            <Button asChild variant="seeker">
              <Link href="/seeker/register/quick">
                {t("emptyCta")}
                <ArrowRight aria-hidden="true" strokeWidth={1.5} data-icon="trailing" />
              </Link>
            </Button>
          </div>
        ) : (
          <ul
            aria-label={t("listLabel")}
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            data-testid="jobs-list"
          >
            {postings.map((p) => (
              <li key={p.id} className="grid">
                <PostingCard posting={p} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
