import { ArrowRight, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { getSiteConfig } from "@/config/site.config";
import { Link } from "@/i18n/navigation";

const WRAP = "h-auto min-h-13 py-3 whitespace-normal";

/**
 * STANDARD v2 3.7 #13a = R-101 ⑤ (수수료 링크) + ⑥ ("구직자 이용료 없음"). Two glass cards: job
 * seekers (warm variant, seeker button "간편 등록", secondary "비자 진단") and employers (brand
 * "무료 채용 진단", glass "구인 의뢰"). The operator phone (site.config) is shown only when set —
 * contacting the operator is allowed by BR-01. Partner CTAs and handoff numbers are removed.
 */
export async function FinalCta() {
  const t = await getTranslations("public.home.finalCta");
  const tc = await getTranslations("common");
  const site = getSiteConfig();
  const phone = site.contact.phone;

  return (
    <section
      className="vj-surface-final relative overflow-hidden py-section-tight"
      aria-labelledby="final-cta-title"
      data-testid="home-final-cta"
    >
      <div className="vj-mesh" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="relative z-1 mx-auto max-w-site px-gutter">
        <div className="mb-11 grid max-w-190 gap-5">
          <span className="inline-flex items-center gap-2.5 text-eyebrow text-white/60 uppercase">
            <span aria-hidden="true" className="h-px w-5.5 bg-current opacity-55" />
            {t("eyebrow")}
          </span>
          <h2 id="final-cta-title" className="reveal text-h1 text-white">
            {t("title")}
          </h2>
          <p className="reveal max-w-130 text-lead text-white/66">{t("lead")}</p>
        </div>

        <div className="grid gap-4.5 md:grid-cols-2">
          <div className="vj-fcta vj-fcta--warm reveal grid content-start gap-4 rounded-lg p-6 md:p-7.5">
            <span className="text-eyebrow font-bold text-white/72 uppercase">
              {t("seeker.kicker")}
            </span>
            <h3 className="text-h3 font-bold text-white">{t("seeker.title")}</h3>
            <p className="max-w-85 text-dense text-white/72">{t("seeker.body")}</p>
            <p className="text-dense font-semibold text-white" data-testid="final-no-seeker-fee">
              {tc("noSeekerFee")}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2.5">
              <Button asChild variant="seeker" className={WRAP} data-magnetic>
                <Link href="/seeker/register/quick">
                  {t("seeker.cta")}
                  <ArrowRight aria-hidden="true" strokeWidth={1.5} data-icon="trailing" />
                </Link>
              </Button>
              <Button asChild variant="glass" className={WRAP}>
                <Link href="/visa-check">{t("seeker.secondary")}</Link>
              </Button>
            </div>
          </div>

          <div
            className="vj-fcta reveal grid content-start gap-4 rounded-lg p-6 md:p-7.5"
            style={{ transitionDelay: "0.08s" }}
          >
            <span className="text-eyebrow font-bold text-white/60 uppercase">
              {t("employer.kicker")}
            </span>
            <h3 className="text-h3 font-bold text-white">{t("employer.title")}</h3>
            <p className="max-w-85 text-dense text-white/66">{t("employer.body")}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2.5">
              <Button asChild variant="brand" className={WRAP} data-magnetic>
                <Link href="/employer/diagnosis">
                  {t("employer.cta")}
                  <ArrowRight aria-hidden="true" strokeWidth={1.5} data-icon="trailing" />
                </Link>
              </Button>
              <Button asChild variant="glass" className={WRAP}>
                <Link href="/employer/request">{t("employer.secondary")}</Link>
              </Button>
              {phone ? (
                <Button asChild variant="glass" className={WRAP}>
                  <a href={`tel:${phone.replace(/[^0-9+]/g, "")}`}>
                    <Phone aria-hidden="true" strokeWidth={1.5} />
                    {t("employer.phone", { phone })}
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <p className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-dense text-white/72">
          <span className="font-semibold text-white">{tc("noSeekerFee")}</span>
          <Link
            href={site.feesPath}
            className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-white underline-offset-4 hover:underline"
            data-testid="final-fees-link"
          >
            {t("feesLink")}
            <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-4" />
          </Link>
        </p>
      </div>
    </section>
  );
}
