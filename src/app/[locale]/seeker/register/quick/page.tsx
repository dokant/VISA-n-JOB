import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ScopedIntlProvider } from "@/components/common/scoped-intl-provider";
import { NoticeBox } from "@/components/legal/notice-box";
import { PageShell } from "@/components/public/page-shell";
import { loadConsentDocuments } from "@/components/seeker/consent-documents";
import { QuickRegisterForm } from "@/components/seeker/quick-register-form";
import { Button } from "@/components/ui/button";
import { Link, redirect } from "@/i18n/navigation";
import { getSidoRegions } from "@/lib/referenceData";
import { safeNextPath } from "@/lib/authGuard";
import { getWizardVisaOptions } from "@/lib/seeker/reference";
import { currentSeekerId } from "@/lib/seeker/session";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sido?: string | string[]; next?: string | string[] }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    locale,
    path: "/seeker/register/quick",
    key: "seekerQuick",
    noindex: true,
  });
}

/**
 * /[locale]/seeker/register/quick — 간편 등록 (R-105, WO §7.2: QR 포스터, 현장 상담회, SNS 링크).
 * `?ref` / `?src` are kept by the middleware (R-111); `?sido` pre-selects the region (PC-8).
 * `?next` (R-203: 면접 신청 from a posting) is a same-origin path to return to after signup; the login
 * link carries it as well. A signed-in seeker goes straight there.
 */
export default async function QuickRegisterPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const nextParam = Array.isArray(sp.next) ? sp.next[0] : sp.next;
  const next = nextParam ? safeNextPath(nextParam, "") || undefined : undefined;
  if (await currentSeekerId()) redirect({ href: next ?? "/seeker/me", locale });
  const t = await getTranslations("seeker.quick");
  const [visas, sido, documents] = await Promise.all([
    getWizardVisaOptions(),
    getSidoRegions(),
    loadConsentDocuments(["PRIVACY_REQUIRED", "BLIND_PROFILE", "NOTICE"], locale),
  ]);
  const sidoParam = Array.isArray(sp.sido) ? sp.sido[0] : sp.sido;
  const initialSido = sido.some((s) => s.code === sidoParam) ? (sidoParam as string) : "";

  return (
    <PageShell eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} narrow>
      <div className="grid max-w-140 gap-6">
        <NoticeBox>
          <strong className="me-1 font-semibold text-navy" data-testid="no-seeker-fee">
            {t("noSeekerFee")}
          </strong>
          {t("notice")}
        </NoticeBox>
        {next ? (
          <p className="text-dense text-n700" data-testid="quick-next-notice">
            {t("nextNotice")}
          </p>
        ) : null}
        <ScopedIntlProvider namespaces={["seeker.register", "seeker.quick", "errors"]}>
          <QuickRegisterForm
            visas={visas}
            sido={sido}
            initialSido={initialSido}
            documents={documents}
            next={next}
          />
        </ScopedIntlProvider>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href={next ? `/seeker/login?next=${encodeURIComponent(next)}` : "/seeker/login"}>
              {t("haveAccount")}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/seeker/register">{t("fullInstead")}</Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
