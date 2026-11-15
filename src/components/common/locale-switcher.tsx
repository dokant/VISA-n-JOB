"use client";

import { Check, Globe } from "lucide-react";
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

// STANDARD 3.2: each language is shown by its own name.
export function LocaleSwitcher() {
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
          aria-label={t("label")}
          disabled={isPending}
          data-testid="locale-switcher"
        >
          <Globe aria-hidden="true" />
          <span lang={current}>{localeNames[current]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            lang={locale}
            onSelect={() => onSelect(locale)}
            aria-current={locale === current ? "true" : undefined}
            data-testid={`locale-option-${locale}`}
          >
            <span className="flex-1">{localeNames[locale]}</span>
            {locale === current ? <Check aria-hidden="true" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
