import type { ReactNode } from "react";

import { Logo } from "@/components/common/logo";
import { RevealController } from "@/components/common/reveal-controller";
import { SiteFooter } from "@/components/common/site-footer";
import { SiteNav } from "@/components/common/site-nav";
import { getFeatureFlags } from "@/config/flags";
import { getSiteConfig } from "@/config/site.config";

/**
 * SiteNav → page → SiteFooter (STANDARD 3.7). Shared by the public area and the seeker / employer
 * areas so every non-admin page has the same frame.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
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
