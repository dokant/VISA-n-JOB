import { getTranslations } from "next-intl/server";

import { getSiteConfig } from "@/config/site.config";
import { Link } from "@/i18n/navigation";
import { localeNames, locales } from "@/i18n/locales";

import { Logo } from "./logo";

type Props = {
  flags: { demandMap: boolean; publicJobs: boolean };
};

type FooterLink = { href: string; label: string };

/**
 * STANDARD v2 3.2 SiteFooter [HO §13] — R-102, WO §13. Registration block from site.config only
 * (no handoff placeholders). Values that are empty are hidden. The operator phone is the only
 * tel: link (BR-01 allows contacting the operator; Q-06 keeps the mobile number off public pages).
 * 5 columns 1.5fr 1fr 1fr 1fr 1.2fr (≤1024 3 columns, ≤760 2 columns), bottom bar with legal links
 * and the 6 language shortcuts.
 */
export async function SiteFooter({ flags }: Props) {
  const t = await getTranslations("footer");
  const site = getSiteConfig();
  const placement = site.jobPlacementAgency;
  const office = site.adminScrivenerOffice;

  const columns: Array<{ title: string; links: FooterLink[] }> = [
    {
      title: t("columns.services"),
      links: [
        { href: "/visa-check", label: t("links.visaCheck") },
        { href: "/score/e74", label: t("links.score") },
        ...(flags.demandMap ? [{ href: "/demand", label: t("links.demand") }] : []),
        ...(flags.publicJobs ? [{ href: "/jobs", label: t("links.jobs") }] : []),
      ],
    },
    {
      title: t("columns.people"),
      links: [
        { href: "/seeker/register/quick", label: t("links.quickRegister") },
        { href: "/seeker/register", label: t("links.register") },
        { href: "/employer/diagnosis", label: t("links.diagnosis") },
        { href: "/employer/request", label: t("links.request") },
      ],
    },
    {
      title: t("columns.company"),
      links: [
        { href: "/about", label: t("links.about") },
        { href: site.feesPath, label: t("links.fees") },
        { href: "/privacy", label: t("links.privacy") },
        { href: "/terms", label: t("links.terms") },
      ],
    },
  ];

  const registration: Array<{ label: string; value: string }> = [
    { label: t("labels.jobPlacement"), value: placement.name },
    { label: t("labels.jobPlacementRegNo"), value: placement.jobPlacementRegNo },
    { label: t("labels.adminOffice"), value: office.name },
    { label: t("labels.adminScrivenerRegNo"), value: office.adminScrivenerRegNo },
    { label: t("labels.businessRegNo"), value: office.businessRegNo },
    { label: t("labels.representative"), value: placement.representative },
    { label: t("labels.address"), value: placement.address },
  ].filter((row) => row.value);

  const phoneHref = site.contact.phone ? `tel:${site.contact.phone.replace(/[^0-9+]/g, "")}` : "";

  return (
    <footer
      className="vj-surface-footer pt-16 text-caption text-white/60"
      data-testid="site-footer"
    >
      <div className="mx-auto max-w-site px-gutter">
        <div className="grid grid-cols-1 gap-8.5 pb-11.5 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[1.5fr_1fr_1fr_1fr_1.2fr]">
          <div className="grid content-start gap-4 xs:col-span-2 lg:col-span-1">
            <Link href="/" className="w-fit rounded-2xs" aria-label={site.brand.wordmark}>
              <Logo tone="dark" withTagline />
            </Link>
            <p className="max-w-80 text-caption leading-relaxed text-white/60">{t("mission")}</p>
          </div>

          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="mb-3.5 text-eyebrow font-bold tracking-[0.14em] text-white/60 uppercase">
                {col.title}
              </h2>
              <ul className="grid gap-1">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-8 items-center text-caption text-white/66 transition-colors duration-200 hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="xs:col-span-2 lg:col-span-3 xl:col-span-1">
            <h2 className="mb-3.5 text-eyebrow font-bold tracking-[0.14em] text-white/60 uppercase">
              {t("columns.registration")}
            </h2>
            <dl className="grid gap-2" data-testid="footer-registration">
              {registration.map((row) => (
                <div key={row.label} className="flex gap-2 text-caption leading-normal">
                  <dt className="flex-none font-medium text-white/72">{row.label}</dt>
                  <dd className="text-white/60">{row.value}</dd>
                </div>
              ))}
              {site.contact.phone ? (
                <div className="flex gap-2 text-caption leading-normal">
                  <dt className="flex-none font-medium text-white/72">{t("labels.phone")}</dt>
                  <dd>
                    <a
                      href={phoneHref}
                      className="text-white/72 underline-offset-4 hover:underline"
                    >
                      {site.contact.phone}
                    </a>
                  </dd>
                </div>
              ) : null}
              {site.contact.email ? (
                <div className="flex gap-2 text-caption leading-normal">
                  <dt className="flex-none font-medium text-white/72">{t("labels.email")}</dt>
                  <dd>
                    <a
                      href={`mailto:${site.contact.email}`}
                      className="text-white/72 underline-offset-4 hover:underline"
                    >
                      {site.contact.email}
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-5 border-t border-white/9 py-5.5 text-caption text-white/60">
          <span>
            {t("copyright", { year: new Date().getFullYear(), brand: site.brand.wordmark })}
          </span>
          <div className="flex flex-wrap gap-x-4.5 gap-y-1">
            <Link href="/privacy" className="inline-flex min-h-8 items-center hover:text-white">
              {t("links.privacy")}
            </Link>
            <Link href="/terms" className="inline-flex min-h-8 items-center hover:text-white">
              {t("links.terms")}
            </Link>
            <Link
              href={site.feesPath}
              className="inline-flex min-h-8 items-center hover:text-white"
            >
              {t("links.fees")}
            </Link>
          </div>
          <nav aria-label={t("languages")} className="flex flex-wrap gap-1.5">
            {locales.map((locale) => (
              <Link
                key={locale}
                href="/"
                locale={locale}
                lang={locale}
                className="inline-flex h-8.5 items-center rounded-full border border-white/16 px-3 text-caption text-white/72 hover:border-white/40 hover:text-white"
              >
                {localeNames[locale]}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
