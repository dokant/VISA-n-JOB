import { ArrowRight, FileDown, FileCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ScopedIntlProvider } from "@/components/common/scoped-intl-provider";
import { ContractForm } from "@/components/employer/contract-form";
import { TermsDocument } from "@/components/employer/terms-document";
import { Button } from "@/components/ui/button";
import { isFeatureEnabled } from "@/config/flags";
import { PageShell } from "@/components/public/page-shell";
import { formatDate } from "@/i18n/dateTime";
import { Link, redirect } from "@/i18n/navigation";
import {
  STAFF_RECORDED_CONTRACT,
  contractStatusOf,
  currentTermsVersion,
  termsPdfPath,
} from "@/lib/employer/contract";
import { currentEmployer } from "@/lib/employer/session";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    locale,
    path: "/employer/contract",
    key: "employerContract",
    noindex: true,
  });
}

/**
 * R-208 /employer/contract (signed-in employers): the 구인 서비스 이용약관 draft ([전문가 검토 필요],
 * Korean original on translated pages — SC-08), its PDF, the required terms box and the separate,
 * optional 체류 업무 위임 box (WO §9.4). After signing: the contract date and, once staff verified the
 * company (R-218), a link to the blind candidates (when FEATURE_EMPLOYER_CANDIDATES is on).
 */
export default async function EmployerContractPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const employer = await currentEmployer();
  if (!employer) {
    redirect({ href: "/employer/login?next=/employer/contract", locale });
    return null;
  }
  const t = await getTranslations("employer.contract");
  const status = await contractStatusOf(employer.companyId);
  const version = currentTermsVersion();
  const candidatesOn = isFeatureEnabled("FEATURE_EMPLOYER_CANDIDATES");

  return (
    <PageShell eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} narrow>
      <div className="grid gap-8">
        <div className="flex flex-wrap gap-2" data-testid="terms-pdf">
          <Button asChild variant="outline">
            <a href={termsPdfPath(version, locale)} download>
              <FileDown aria-hidden="true" strokeWidth={1.5} />
              {t("downloadPdf")}
            </a>
          </Button>
          {locale !== "ko" ? (
            <Button asChild variant="ghost">
              <a href={termsPdfPath(version, "ko")} download lang="ko">
                <FileDown aria-hidden="true" strokeWidth={1.5} />
                {t("downloadKoPdf")}
              </a>
            </Button>
          ) : null}
        </div>

        <section aria-label={t("documentLabel")}>
          <TermsDocument locale={locale} />
        </section>

        {status?.signedAt ? (
          <section
            className="grid gap-3 rounded-md border border-border bg-white p-6 shadow-1"
            data-testid="contract-signed"
          >
            <h2 className="flex items-center gap-2 text-h3 text-navy">
              <FileCheck aria-hidden="true" strokeWidth={1.5} className="size-6" />
              {t("signed.title")}
            </h2>
            <ul className="grid gap-1 text-dense text-n700">
              <li>
                {t("signed.date", {
                  date: formatDate(locale, status.signedAt, { dateStyle: "long" }),
                })}
              </li>
              <li>
                {status.version === STAFF_RECORDED_CONTRACT
                  ? t("signed.staffRecorded")
                  : t("signed.version", { version: status.version ?? "" })}
              </li>
              <li data-testid="contract-mandate-status">
                {status.visaMandateAgreed ? t("signed.mandateYes") : t("signed.mandateNo")}
              </li>
            </ul>
            {status.verified && candidatesOn ? (
              <div>
                {/* STANDARD v2.23 3.1 button wrap variant (QA P2e run 2 O-1): ru label is wider than 375px. */}
                <Button
                  asChild
                  className="h-auto min-h-13 max-w-full py-3 text-center whitespace-normal"
                >
                  <Link href="/employer/candidates" data-testid="contract-candidates-link">
                    {t("next.candidates")}
                    <ArrowRight aria-hidden="true" strokeWidth={1.5} data-icon="trailing" />
                  </Link>
                </Button>
              </div>
            ) : !status.verified ? (
              <p className="text-dense text-n700">{t("next.pending")}</p>
            ) : null}
          </section>
        ) : (
          <ScopedIntlProvider namespaces={["employer.contract"]}>
            <ContractForm />
          </ScopedIntlProvider>
        )}
      </div>
    </PageShell>
  );
}
