import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { ScopedIntlProvider } from "@/components/common/scoped-intl-provider";
import { SectionHeader } from "@/components/common/section-header";
import { NoticeBox } from "@/components/legal/notice-box";
import { BlockedNotice } from "@/components/seeker/blocked-notice";
import { loadConsentDocuments } from "@/components/seeker/consent-documents";
import { WizardProgress } from "@/components/seeker/wizard-progress";
import { WizardStartForm } from "@/components/seeker/wizard-start-form";
import { Step1Form, Step2Form, Step3aForm, Step3bForm } from "@/components/seeker/wizard-steps-a";
import {
  Step4Form,
  Step5aForm,
  Step5bForm,
  Step6Form,
  Step7Form,
} from "@/components/seeker/wizard-steps-b";
import type { ClientReference } from "@/components/seeker/wizard-types";
import { Button } from "@/components/ui/button";
import { Link, redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { ensureSeekerProfile } from "@/lib/seeker/account";
import { activeConsents } from "@/lib/seeker/consent";
import { REGISTRATION_CONSENTS, WIZARD_LAST_STEP } from "@/lib/seeker/options";
import { getWizardReference } from "@/lib/seeker/reference";
import { REF_COOKIE, normalizeReferralCode } from "@/lib/seeker/referral";
import { canOpenStep, classifyProfile, resumePoint } from "@/lib/seeker/saveStep";
import { currentSeekerId } from "@/lib/seeker/session";
import { wizardValues } from "@/lib/seeker/wizardValues";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { loadVisaTypeForTrack } from "@/lib/visa-engine/classifyTrack";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ step?: string | string[]; sub?: string | string[] }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    locale,
    path: "/seeker/register",
    key: "seekerRegister",
    noindex: true,
  });
}

type Screen = { step: number; sub?: "a" | "b" };

/** Path of the screen before `s` (Step 1 has none: Step 0 created the account). */
function previous(s: Screen): Screen | null {
  if (s.step === 3 && s.sub === "b") return { step: 3, sub: "a" };
  if (s.step === 5 && s.sub === "b") return { step: 5, sub: "a" };
  if (s.step <= 1) return null;
  const step = s.step - 1;
  return step === 3 || step === 5 ? { step, sub: "b" } : { step };
}

function href(s: Screen): string {
  return `/seeker/register?step=${s.step}${s.sub ? `&sub=${s.sub}` : ""}`;
}

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/**
 * /[locale]/seeker/register — 정식 등록 위저드 (R-106, R-107). Step 0 creates the account; every
 * later screen is saved on "다음" and a returning seeker continues at completedStep + 1.
 */
export default async function RegisterPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("seeker.register");
  const sp = await searchParams;
  const userId = await currentSeekerId();

  const frame = (step: number, stepName: string, saved: boolean, body: ReactNode) => (
    <main id="main" className="pt-16 md:pt-19">
      <WizardProgress step={step} stepName={stepName} saved={saved} />
      <div className="mx-auto box-content grid max-w-xl gap-6 px-gutter py-10">
        <header className="grid gap-3">
          <SectionHeader as="h1" title={stepName} lead={t(`step${step}.lead`)} />
          <p className="text-caption font-semibold text-brand-blue-700" data-testid="no-seeker-fee">
            {t("common.noSeekerFee")}
          </p>
        </header>
        <ScopedIntlProvider namespaces={["seeker.register", "errors"]}>{body}</ScopedIntlProvider>
      </div>
    </main>
  );

  if (!userId) {
    const ref = normalizeReferralCode((await cookies()).get(REF_COOKIE)?.value) ?? "";
    return frame(
      0,
      t("step0.title"),
      false,
      <div className="grid gap-6">
        <NoticeBox>{t("step0.notice")}</NoticeBox>
        <WizardStartForm referralCode={ref} />
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/seeker/login?next=/seeker/register">{t("step0.haveAccount")}</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/seeker/register/quick">{t("step0.quickInstead")}</Link>
          </Button>
        </div>
      </div>,
    );
  }

  await ensureSeekerProfile(userId);
  const profile = await db.seekerProfile.findUniqueOrThrow({
    where: { userId },
    include: { experiences: true },
  });
  if (profile.completedStep >= WIZARD_LAST_STEP) redirect({ href: "/seeker/me", locale });

  const stepParam = Number(one(sp.step));
  const subParam = one(sp.sub) === "b" ? "b" : one(sp.sub) === "a" ? "a" : undefined;
  let screen: Screen = resumePoint(profile);
  if (Number.isInteger(stepParam) && canOpenStep(profile, stepParam, subParam)) {
    screen =
      stepParam === 3 || stepParam === 5
        ? { step: stepParam, sub: subParam ?? "a" }
        : { step: stepParam };
  }

  const now = new Date();
  const track = profile.visaCode ? await classifyProfile(profile, now) : null;
  const stepName = t(`step${screen.step}.title`);
  const prev = previous(screen);
  const backHref = prev ? href(prev) : undefined;

  if (screen.step >= 3 && track && !track.registrable) {
    return frame(
      screen.step,
      stepName,
      profile.completedStep > 0,
      <div className="grid gap-5">
        <BlockedNotice reason={track.reason} />
        <div>
          <Button asChild variant="outline">
            <Link href={href({ step: 2 })}>{t("common.changeVisa")}</Link>
          </Button>
        </div>
      </div>,
    );
  }

  const [ref, visa, consents] = await Promise.all([
    getWizardReference(),
    loadVisaTypeForTrack(profile.visaCode),
    activeConsents(userId),
  ]);
  const reference: ClientReference = {
    ...ref,
    nowYear: now.getUTCFullYear(),
    requiresGraduationDate: visa?.requiresGraduationDate ?? false,
    blindProfileRequired: track?.registrable === true && track.track === "JOB_MATCH",
  };
  const values = wizardValues(
    profile,
    consents.map((c) => c.type),
  );
  const common = { reference, backHref };
  const key = `${screen.step}${screen.sub ?? ""}`;

  let body: ReactNode;
  switch (key) {
    case "1":
      body = <Step1Form {...common} values={values["1"]} />;
      break;
    case "2":
      body = <Step2Form {...common} values={values["2"]} />;
      break;
    case "3a":
      body = <Step3aForm {...common} values={values["3a"]} />;
      break;
    case "3b":
      body = <Step3bForm {...common} values={values["3b"]} />;
      break;
    case "4":
      body = <Step4Form {...common} values={values["4"]} />;
      break;
    case "5a":
      body = <Step5aForm {...common} values={values["5a"]} />;
      break;
    case "5b":
      body = <Step5bForm {...common} values={values["5b"]} />;
      break;
    case "6":
      body = <Step6Form {...common} values={values["6"]} />;
      break;
    default:
      body = (
        <Step7Form
          {...common}
          values={values["7"]}
          documents={await loadConsentDocuments(REGISTRATION_CONSENTS, locale)}
        />
      );
  }

  return frame(
    screen.step,
    screen.sub
      ? `${stepName} (${t("common.subScreen", { current: screen.sub === "a" ? 1 : 2, total: 2 })})`
      : stepName,
    profile.completedStep > 0,
    <div data-step={key} data-testid="wizard-screen">
      {body}
    </div>,
  );
}
