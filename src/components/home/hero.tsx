import { ArrowRight, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { getSiteConfig } from "@/config/site.config";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * STANDARD v2 3.7 #2 Hero [HO §2] with the 3.8 no-asset rules: CSS film plate only (no video),
 * moving layers only ≥1025px without reduced motion, LCP = the H1 text.
 * Copy is the handoff copy without numbers (K-11); C-18: superlative copy kept and marked
 * [전문가 검토 필요] in messages (public.home.hero.expertReviewNote). Corner metadata removed
 * except the registration number (K-20). Stat strip = PRD facts (registration number, 구직자 이용료
 * 없음, 6 languages, 행정사 사무소) — empty site.config values are hidden.
 */
export async function Hero() {
  const t = await getTranslations("public.home.hero");
  const tc = await getTranslations("common");
  const site = getSiteConfig();
  const regNo = site.jobPlacementAgency.jobPlacementRegNo;
  const office = site.adminScrivenerOffice.name;

  const cells = [
    regNo
      ? { key: "regNo", label: t("stats.regNo.label"), value: regNo, sub: t("stats.regNo.sub") }
      : null,
    {
      key: "noFee",
      label: t("stats.noFee.label"),
      value: tc("noSeekerFee"),
      sub: t("stats.noFee.sub"),
    },
    {
      key: "languages",
      label: t("stats.languages.label"),
      value: t("stats.languages.value"),
      sub: t("stats.languages.sub"),
    },
    office
      ? { key: "office", label: t("stats.office.label"), value: office, sub: t("stats.office.sub") }
      : null,
  ].filter((c): c is { key: string; label: string; value: string; sub: string } => c !== null);

  return (
    <section
      className="vj-surface-hero relative isolate flex min-h-svh flex-col justify-end overflow-hidden pt-30"
      aria-labelledby="hero-title"
      data-testid="home-hero"
    >
      <div className="vj-film" aria-hidden="true">
        <div className="vj-film__moving">
          <div className="vj-film__glow" />
          <div className="vj-film__beam vj-film__beam--a" />
          <div className="vj-film__beam vj-film__beam--b" />
          <div className="vj-film__beam vj-film__beam--c" />
        </div>
        <div className="vj-film__grid" />
        <div className="vj-film__moving">
          <div className="vj-film__grain" />
        </div>
        <div className="vj-film__horizon" />
      </div>

      <div className="relative z-3 pb-7 md:pb-13">
        <div className="mx-auto max-w-site px-gutter">
          <div className="max-w-235">
            <span className="vj-hero-badge reveal mb-6.5 inline-flex max-w-full items-center gap-2.5 rounded-full py-1.75 ps-2 pe-3.5 text-meta text-white/86">
              <span className="vj-hero-pill inline-flex flex-none items-center rounded-full px-2 py-0.75">
                <ShieldCheck aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
              </span>
              <span className="min-w-0">{t("badge")}</span>
            </span>
            <h1
              id="hero-title"
              className="reveal text-display text-white"
              style={{ ["--reveal-y" as string]: "26px" }}
            >
              <span className="block">{t("titleLine1")}</span>
              <span className="block">
                {t("titleLine2")} <em className="vj-grad-text not-italic">{t("titleEmphasis")}</em>
              </span>
            </h1>
            <p
              className="reveal mt-6 max-w-155 text-lead text-white/66"
              style={{ ["--reveal-y" as string]: "22px", transitionDelay: "0.08s" }}
            >
              <span lang="en">{t("subLatin")}</span>
              <br />
              {t("sub")}
            </p>
            <div
              className="reveal mt-9 flex flex-wrap items-center gap-3"
              style={{ ["--reveal-y" as string]: "20px", transitionDelay: "0.16s" }}
            >
              <Button asChild variant="brand" size="lg" data-magnetic>
                <Link href="/employer/diagnosis">
                  {t("primaryCta")}
                  <ArrowRight aria-hidden="true" strokeWidth={1.5} data-icon="trailing" />
                </Link>
              </Button>
              <Button asChild variant="glass" className="h-13">
                <Link href="/visa-check">{t("secondaryCta")}</Link>
              </Button>
            </div>
          </div>

          {regNo ? (
            <div className="mt-6 flex items-end justify-end gap-5 border-t border-white/10 pt-3.5 md:mt-10">
              <span className="text-end text-eyebrow leading-normal tracking-[0.14em] text-white/60 uppercase">
                {t("licenseLabel")}
                <br />
                <b className="font-semibold text-white/86 normal-case">
                  {t("licenseValue", { regNo })}
                </b>
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-32 left-1/2 z-4 hidden -translate-x-1/2 flex-col items-center gap-2.5 text-eyebrow tracking-[0.14em] text-white/60 md:flex"
      >
        <span>{t("scroll")}</span>
        <i className="vj-scroll-cue__line" />
      </div>

      <div className="relative z-3 border-t border-white/12" data-testid="hero-stats">
        <div className="mx-auto max-w-site px-gutter">
          <dl className="grid grid-cols-2 gap-px bg-white/10 lg:grid-cols-4">
            {cells.map((cell, index) => (
              <div
                key={cell.key}
                className={cn(
                  "vj-hero-cell grid content-start gap-1.25 px-5.5 py-4.5",
                  index === 0 && "lg:bg-transparent lg:ps-0",
                )}
              >
                <dt className="text-eyebrow tracking-[0.14em] text-white/60 uppercase">
                  {cell.label}
                </dt>
                <dd className="text-dense font-medium text-white/90">
                  {cell.value}
                  <small className="mt-0.5 block text-caption font-normal text-white/60">
                    {cell.sub}
                  </small>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
