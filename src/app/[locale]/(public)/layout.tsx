import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";

import { SiteChrome } from "@/components/public/site-chrome";

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
  return <SiteChrome>{children}</SiteChrome>;
}
