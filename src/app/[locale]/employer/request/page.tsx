import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";

import { ScopedIntlProvider } from "@/components/common/scoped-intl-provider";
import { JobRequestForm } from "@/components/employer/job-request-form";
import { JobRequestList } from "@/components/employer/job-request-list";
import { ExpertReviewMark } from "@/components/legal/expert-review-mark";
import { NoticeBox } from "@/components/legal/notice-box";
import { PageShell } from "@/components/public/page-shell";
import { redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { listCompanyRequests } from "@/lib/employer/jobRequest";
import { currentEmployer } from "@/lib/employer/session";
import { getSidoRegions } from "@/lib/referenceData";
import { getSigunguOptions } from "@/lib/seeker/reference";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    locale,
    path: "/employer/request",
    key: "employerRequest",
    noindex: true,
  });
}

/**
 * R-125 구인 의뢰서 (signed-in employers). The company's own values prefill step 1 (decrypted by
 * the db extension for its owner only); the list shows the company's requests with their status
 * (검증 대기 / 검증 완료 / 종료) — the employer's view of the staff verification queue.
 * The notice on collecting the contact person's details is a notice draft: it carries
 * [전문가 검토 필요] (DECISIONS Q-12 ③, STANDARD 3.5) and, on non-Korean pages, the Korean
 * original next to the translation (SC-08).
 */
export default async function EmployerRequestPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const employer = await currentEmployer();
  if (!employer) {
    redirect({ href: "/employer/login?next=/employer/request", locale });
    return null;
  }
  const t = await getTranslations("employer.request");
  const tKo = await getTranslations({ locale: "ko", namespace: "employer.request" });
  const tl = await getTranslations("legal");
  const tr = await getTranslations();
  const format = await getFormatter();
  const [company, sidos, sigungus, requests] = await Promise.all([
    db.company.findUnique({
      where: { id: employer.companyId },
      select: { nameEnc: true, sido: true, sigungu: true, employeeCount: true },
    }),
    getSidoRegions(),
    getSigunguOptions(),
    listCompanyRequests(employer.companyId),
  ]);

  return (
    <PageShell eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} narrow>
      <div className="grid gap-8">
        <div className="grid gap-3" data-testid="request-notice">
          <ExpertReviewMark />
          <NoticeBox>{t("notice")}</NoticeBox>
          {locale !== "ko" ? (
            <div className="grid gap-1 rounded-sm border border-n200 bg-n50 px-3.5 py-3">
              <span className="text-label text-n500">{tl("koreanOriginal")}</span>
              <p lang="ko" className="text-dense text-n700">
                {tKo("notice")}
              </p>
            </div>
          ) : null}
        </div>
        <ScopedIntlProvider namespaces={["employer.request", "errors"]}>
          <JobRequestForm
            sidos={sidos.map((s) => ({ code: s.code, label: tr(s.nameKey) }))}
            sigungus={sigungus}
            defaults={{
              companyName: company?.nameEnc ?? "",
              sido: company?.sido ?? "",
              sigungu: company?.sigungu ?? "",
              employeeCount: company?.employeeCount ? String(company.employeeCount) : "",
            }}
          />
        </ScopedIntlProvider>
        <JobRequestList
          title={t("list.title")}
          empty={t("list.empty")}
          items={requests.map((r) => ({
            id: r.id,
            title: r.title ?? t("list.untitled"),
            requestedAt: r.requestedAt
              ? t("list.requestedAt", {
                  date: format.dateTime(r.requestedAt, { dateStyle: "medium" }),
                })
              : "",
            status:
              r.grade === "A"
                ? t("list.status.verified")
                : r.grade === "B"
                  ? t("list.status.reviewing")
                  : t("list.status.closed"),
            tone: r.grade === "A" ? "verified" : r.grade === "B" ? "reviewing" : "closed",
          }))}
        />
      </div>
    </PageShell>
  );
}
