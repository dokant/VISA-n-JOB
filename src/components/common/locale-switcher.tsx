"use client";

import { ChevronDown, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Locale, localeNames, locales } from "@/i18n/locales";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Props = {
  /** "light" = white pill on light surfaces / scrolled nav. "dark" = translucent pill over the hero. */
  tone?: "light" | "dark";
};

// STANDARD v2 3.2 LocaleSwitcher: 6 languages only, each in its own name. Pill button with
// Globe + upper-case code + ChevronDown (13px/600). 38px tall on desktop, 44px below 1025px (B-10).
export function LocaleSwitcher({ tone = "light" }: Props) {
  const t = useTranslations("common.localeSwitcher");
  const current = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function onSelect(next: Locale) {
    if (next === current) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={t("label")}
          disabled={isPending}
          data-testid="locale-switcher"
          className={cn(
            "gap-1.75 px-3 text-caption font-semibold tracking-wide shadow-none lg:h-9.5",
            tone === "light"
              ? "border-n200 bg-white text-navy hover:border-input"
              : "border-white/22 bg-white/7 text-white hover:border-white/22 hover:bg-white/16",
          )}
        >
          <Globe aria-hidden="true" strokeWidth={1.5} className="size-4" />
          <span aria-hidden="true">{current.toUpperCase()}</span>
          <span className="sr-only" lang={current}>
            {localeNames[current]}
          </span>
          <ChevronDown aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10}>
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            lang={locale}
            onSelect={() => onSelect(locale)}
            aria-current={locale === current ? "true" : undefined}
            data-testid={`locale-option-${locale}`}
            className="justify-between gap-2.5"
          >
            <span>{localeNames[locale]}</span>
            <span aria-hidden="true" className="text-eyebrow tracking-widest opacity-50">
              {locale.toUpperCase()}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
