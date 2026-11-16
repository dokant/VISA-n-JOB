import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";

import { Logo } from "@/components/common/logo";
import { RevealController } from "@/components/common/reveal-controller";
import { SiteFooter } from "@/components/common/site-footer";
import { SiteNav } from "@/components/common/site-nav";
import { getFeatureFlags } from "@/config/flags";
import { getSiteConfig } from "@/config/site.config";

/** Public area shell (STANDARD 3.7): SiteNav → page → SiteFooter. */
export default async function PublicLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Needed in every layout that renders translated server components (keeps pages static).
  const { locale } = await params;
  setRequestLocale(locale);
  const flags = getFeatureFlags();
  const navFlags = { demandMap: flags.FEATURE_DEMAND_MAP, publicJobs: flags.FEATURE_PUBLIC_JOBS };
  const site = getSiteConfig();

  return (
    <>
      <SiteNav
        logo={<Logo tone="inherit" withTagline />}
        flags={navFlags}
        operatorPhone={site.contact.phone}
        address={site.jobPlacementAgency.address}
      />
      <RevealController />
      {children}
      <SiteFooter flags={navFlags} />
    </>
  );
}
