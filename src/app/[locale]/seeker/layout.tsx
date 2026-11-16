import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";

import { SiteChrome } from "@/components/public/site-chrome";

/** seeker area shell: same frame as the public pages (STANDARD 3.7). */
export default async function SeekerLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SiteChrome>{children}</SiteChrome>;
}
