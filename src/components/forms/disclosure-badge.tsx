"use client";

import { Eye, Lock } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";

export type Disclosure = "private" | "blind";

/**
 * STANDARD v2 3.2 DisclosureBadge (WO §7.1, SC-04). Fixed sentences:
 * private = "이 정보는 기업에 공개되지 않습니다" (neutral badge + Lock),
 * blind = "블라인드로 공개됩니다" (blue badge + Eye). Sentence badge: text-caption, wraps.
 */
export function DisclosureBadge({ variant }: { variant: Disclosure }) {
  const t = useTranslations("seeker.register.disclosure");
  const Icon = variant === "blind" ? Eye : Lock;
  return (
    <Badge
      variant={variant === "blind" ? "blue" : "neutral"}
      className="h-auto py-1 text-caption tracking-normal whitespace-normal"
      data-testid={`disclosure-badge-${variant}`}
    >
      <Icon aria-hidden="true" strokeWidth={1.5} />
      {t(variant)}
    </Badge>
  );
}

/** Field-level icon next to a label (14px, n500 private / blue-700 blind) + sr-only text. */
export function DisclosureIcon({ variant }: { variant: Disclosure }) {
  const t = useTranslations("seeker.register.disclosure");
  const Icon = variant === "blind" ? Eye : Lock;
  return (
    <span className="ms-1.5 inline-flex align-middle" data-disclosure={variant}>
      <Icon
        aria-hidden="true"
        strokeWidth={1.5}
        className={variant === "blind" ? "size-3.5 text-brand-blue-700" : "size-3.5 text-n500"}
      />
      <span className="sr-only">{t(variant)}</span>
    </span>
  );
}

/**
 * Step-bottom summary (SC-04): which fields of this screen are shown to employers in blind form
 * and which are never shown. n50 box, rounded-sm, two groups in text-dense.
 */
export function DisclosureSummary({
  blind,
  hidden,
}: {
  blind: readonly string[];
  hidden: readonly string[];
}) {
  const t = useTranslations("seeker.register.disclosure");
  return (
    <section
      className="grid gap-3 rounded-sm border border-n200 bg-n50 px-3.5 py-3"
      aria-label={t("summaryTitle")}
      data-testid="disclosure-summary"
    >
      {blind.length > 0 ? (
        <div className="grid gap-1.5">
          <DisclosureBadge variant="blind" />
          <p className="text-dense text-n700">{blind.join(", ")}</p>
        </div>
      ) : null}
      {hidden.length > 0 ? (
        <div className="grid gap-1.5">
          <DisclosureBadge variant="private" />
          <p className="text-dense text-n700">{hidden.join(", ")}</p>
        </div>
      ) : null}
    </section>
  );
}
