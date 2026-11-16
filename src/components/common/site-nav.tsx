"use client";

import { ArrowRight, Menu, Phone, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { LocaleSwitcher } from "./locale-switcher";

type NavItem = { href: string; label: string; sub: string };

type Props = {
  /** Server-rendered <Logo tone="inherit" /> (site.config values stay on the server). */
  logo: ReactNode;
  flags: { demandMap: boolean; publicJobs: boolean };
  /** Operator phone from site.config (BR-01 allows contacting the operator). Empty = hidden. */
  operatorPhone: string;
  address: string;
};

const SCROLL_THRESHOLD = 24;

/**
 * STANDARD v2 3.2 SiteNav [HO §1]. Fixed bar, 76px (66px once scrolled past 24px, 64px ≤760px).
 * Over the home hero only it starts transparent with white text; elsewhere it starts in the scrolled
 * look (white/82 + blur). Route links with aria-current="page". Max 6 links; /jobs and /demand only
 * when their flags are on (SC-07). <1025px: burger → full-screen sheet.
 */
export function SiteNav({ logo, flags, operatorPhone, address }: Props) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > SCROLL_THRESHOLD);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    const mq = window.matchMedia("(min-width: 1025px)");
    const onWide = () => mq.matches && setOpen(false);
    mq.addEventListener("change", onWide);
    return () => {
      window.removeEventListener("scroll", onScroll);
      mq.removeEventListener("change", onWide);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const items: NavItem[] = [
    { href: "/seeker/register/quick", label: t("seeker"), sub: t("seekerSub") },
    { href: "/employer/diagnosis", label: t("employer"), sub: t("employerSub") },
    { href: "/visa-check", label: t("visaCheck"), sub: t("visaCheckSub") },
    ...(flags.publicJobs ? [{ href: "/jobs", label: t("jobs"), sub: t("jobsSub") }] : []),
    ...(flags.demandMap ? [{ href: "/demand", label: t("demand"), sub: t("demandSub") }] : []),
    { href: "/about", label: t("about"), sub: t("aboutSub") },
    { href: "/fees", label: t("fees"), sub: t("feesSub") },
  ].slice(0, 6);

  const solid = !isHome || scrolled || open;
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      data-testid="site-nav"
      data-solid={solid ? "true" : "false"}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,height,color,backdrop-filter] duration-400 ease-standard",
        "border-b",
        solid
          ? "border-navy/8 bg-white/82 text-navy backdrop-blur-[22px] backdrop-saturate-160"
          : "border-transparent bg-transparent text-white",
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-site items-center gap-7 px-gutter transition-[height] duration-400 ease-standard",
          "h-16 md:h-19",
          scrolled && "md:h-16.5",
        )}
      >
        <Link href="/" aria-label={t("home")} className="flex-none rounded-2xs">
          {logo}
        </Link>

        <nav aria-label={t("mainLabel")} className="hidden flex-1 justify-center lg:flex">
          <ul className="flex items-center gap-5 xl:gap-6.5">
            {items.map((item) => {
              const current = isCurrent(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "group relative inline-flex min-h-11 items-center text-dense whitespace-nowrap transition-opacity duration-300",
                      current
                        ? "font-semibold opacity-100"
                        : "font-medium opacity-82 hover:opacity-100",
                    )}
                  >
                    {item.label}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute inset-x-0 bottom-2.5 h-0.375 origin-left bg-current transition-transform duration-400 ease-out",
                        current ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                      )}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ms-auto flex flex-none items-center gap-3.5 lg:ms-0">
          <LocaleSwitcher tone={solid ? "light" : "dark"} />
          <Button asChild variant="brand" size="sm" className="hidden lg:inline-flex" data-magnetic>
            <Link href="/employer/diagnosis">
              {t("cta")}
              <ArrowRight aria-hidden="true" strokeWidth={1.5} data-icon="trailing" />
            </Link>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant={solid ? "outline" : "glass"}
                size="sm"
                className="w-11 px-0 lg:hidden"
                aria-label={t("openMenu")}
                data-testid="nav-burger"
              >
                <Menu aria-hidden="true" strokeWidth={1.5} />
              </Button>
            </SheetTrigger>
            <SheetContent aria-describedby={undefined} data-testid="nav-drawer">
              <SheetTitle className="sr-only">{t("menuTitle")}</SheetTitle>
              <SheetClose asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute end-gutter top-5 w-11 px-0 [&_svg]:transition-transform hover:[&_svg]:rotate-90"
                  aria-label={t("closeMenu")}
                >
                  <X aria-hidden="true" strokeWidth={1.5} />
                </Button>
              </SheetClose>
              <nav aria-label={t("mainLabel")}>
                <ul>
                  {items.map((item) => (
                    <li key={item.href} className="border-b border-n200">
                      <SheetClose asChild>
                        <Link
                          href={item.href}
                          aria-current={isCurrent(item.href) ? "page" : undefined}
                          className="flex min-h-11 items-center justify-between gap-4 py-4.5 text-h3 font-semibold text-navy"
                        >
                          {item.label}
                          <span className="text-eyebrow font-medium tracking-[0.14em] text-n500 uppercase">
                            {item.sub}
                          </span>
                        </Link>
                      </SheetClose>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="mt-auto grid gap-3 pt-8">
                <Button asChild variant="brand" className="w-full">
                  <Link href="/employer/diagnosis" onClick={() => setOpen(false)}>
                    {t("cta")}
                    <ArrowRight aria-hidden="true" strokeWidth={1.5} data-icon="trailing" />
                  </Link>
                </Button>
                {operatorPhone ? (
                  <Button asChild variant="outline" className="w-full">
                    <a href={`tel:${operatorPhone.replace(/[^0-9+]/g, "")}`}>
                      <Phone aria-hidden="true" strokeWidth={1.5} />
                      {operatorPhone}
                    </a>
                  </Button>
                ) : null}
                {address ? <p className="text-caption text-n500">{address}</p> : null}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
