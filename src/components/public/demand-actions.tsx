import { Bell, ShieldCheck } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { getPathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Option = { code: string; label: string };

/** Long translated labels wrap instead of overflowing at 375px (N-04). */
const WRAP = "h-auto min-h-13 w-full py-3 whitespace-normal sm:w-auto";

type Props = {
  sidos: Option[];
  industries: Option[];
  tone?: "light" | "dark";
  className?: string;
};

/**
 * R-117 / WO §8.4: the ONLY two buttons of the demand map — "이 지역·업종 일자리 알림 받기" (PC-8:
 * goes to 간편 등록 with sido/industry in the query) and "내 비자로 가능한지 확인" (/visa-check with
 * the same query). One GET form, two submit buttons with their own formAction, so the chosen
 * 시·도 / 업종 travel without JavaScript and no third button exists.
 */
export async function DemandActions({ sidos, industries, tone = "light", className }: Props) {
  const t = await getTranslations("public.demand");
  const locale = await getLocale();
  const alertHref = getPathname({ href: "/seeker/register/quick", locale });
  const visaHref = getPathname({ href: "/visa-check", locale });
  const labelClass = cn("text-label", tone === "dark" ? "text-white/72" : "text-n700");

  return (
    <form
      method="get"
      action={visaHref}
      className={cn("grid gap-4", className)}
      data-testid="demand-actions"
    >
      <fieldset className="grid gap-3 md:grid-cols-2">
        <legend className={cn("mb-2 text-label", tone === "dark" ? "text-white/72" : "text-n700")}>
          {t("filter.title")}
        </legend>
        <label className="grid gap-1.75">
          <span className={labelClass}>{t("filter.sido")}</span>
          <NativeSelect name="sido" defaultValue="">
            <option value="">{t("filter.any")}</option>
            {sidos.map((s) => (
              <option key={s.code} value={s.code}>
                {s.label}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="grid gap-1.75">
          <span className={labelClass}>{t("filter.industry")}</span>
          <NativeSelect name="industryCode" defaultValue="">
            <option value="">{t("filter.any")}</option>
            {industries.map((i) => (
              <option key={i.code} value={i.code}>
                {i.label}
              </option>
            ))}
          </NativeSelect>
        </label>
      </fieldset>
      <div className="flex flex-wrap gap-3" data-testid="demand-buttons">
        <Button type="submit" variant="seeker" formAction={alertHref} className={WRAP}>
          <Bell aria-hidden="true" strokeWidth={1.5} />
          {t("buttons.alert")}
        </Button>
        <Button
          type="submit"
          variant={tone === "dark" ? "glass" : "outline"}
          formAction={visaHref}
          className={WRAP}
        >
          <ShieldCheck aria-hidden="true" strokeWidth={1.5} />
          {t("buttons.visaCheck")}
        </Button>
      </div>
    </form>
  );
}
