import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ScopedIntlProvider } from "@/components/common/scoped-intl-provider";
import { DiagnosisForm } from "@/components/employer/diagnosis-form";
import { NoticeBox } from "@/components/legal/notice-box";
import { PageShell } from "@/components/public/page-shell";
import { getIndustries, getSidoRegions, getVisaTypes } from "@/lib/referenceData";
import { getSigunguOptions } from "@/lib/seeker/reference";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({ locale, path: "/employer/diagnosis", key: "employerDiagnosis" });
}

/**
 * R-124 무료 채용 진단 (home main CTA, Q-07). Public: no sign-in needed. Reference data from the
 * database; the result comes only from evaluate.ts over PUBLISHED rules (YELLOW + "행정사 확인 필요"
 * when none matches, WO §15-9) and is saved as a lead.
 */
export default async function EmployerDiagnosisPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("employer.diagnosis");
  const tr = await getTranslations();
  const [industries, sidos, sigungus, visaTypes] = await Promise.all([
    getIndustries(),
    getSidoRegions(),
    getSigunguOptions(),
    getVisaTypes(),
  ]);
  return (
    <PageShell eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} narrow>
      <div className="grid gap-6">
        <NoticeBox>{t("notice")}</NoticeBox>
        <ScopedIntlProvider namespaces={["employer.diagnosis", "errors"]}>
          <DiagnosisForm
            industries={industries.map((i) => ({ code: i.code, label: tr(i.nameKey) }))}
            sidos={sidos.map((s) => ({ code: s.code, label: tr(s.nameKey) }))}
            sigungus={sigungus}
            visas={visaTypes
              .filter((v) => v.isStatusCode)
              .map((v) => ({ code: v.code, label: [v.code, tr(v.nameKey)].join(" ") }))}
          />
        </ScopedIntlProvider>
      </div>
    </PageShell>
  );
}
