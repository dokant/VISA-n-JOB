import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

type Props = {
  code: string;
  /** VisaType.nameKey, e.g. visaType.f4.name (STANDARD 3.6). */
  nameKey: string;
  /** VisaType.isStatusCode: false → the row is not a 체류자격 code (기타·없음·모름), name only (B-3). */
  showCode?: boolean;
  tone?: "light" | "dark";
  className?: string;
};

/**
 * STANDARD v2 3.2 VisaLabel — the only way a visa is shown: `{code} {easy name}`. Rows that are not a
 * 체류자격 code (VisaType.isStatusCode=false: 기타·없음·모름) show the name only (v2.7 B-3).
 * Code chip text-eyebrow 700 0.06em, blue-700 on tint-blue, 3px/6px padding, 4px radius, 9px gap
 * [HO `.vchip .code`, B-03, B-07]. Dark surfaces: white/14 chip with cyan text.
 */
export function VisaLabel({ code, nameKey, showCode = true, tone = "light", className }: Props) {
  const t = useTranslations();
  if (!showCode) return <span className={className}>{t(nameKey)}</span>;
  return (
    <span className={cn("inline-flex items-center gap-2.25", className)}>
      <span
        className={cn(
          "rounded-2xs px-1.5 py-0.75 text-eyebrow font-bold tracking-[0.06em] whitespace-nowrap",
          tone === "dark" ? "bg-white/14 text-brand-cyan" : "bg-tint-blue text-brand-blue-700",
        )}
      >
        {code}
      </span>
      <span>{t(nameKey)}</span>
    </span>
  );
}
