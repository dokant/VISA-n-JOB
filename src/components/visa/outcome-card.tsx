import type { Outcome } from "@prisma/client";
import { ArrowRight, CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { CONSULT_HREF } from "@/components/common/coming-soon";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { REFERENCE_DISCLAIMER_KEY } from "@/lib/visa-engine/constants";

import { VisaLabel } from "./visa-label";

const STYLE: Record<Outcome, { icon: typeof CircleCheck; card: string; icon_: string }> = {
  GREEN: {
    icon: CircleCheck,
    card: "border-success bg-success-subtle text-success-subtle-foreground",
    icon_: "text-success",
  },
  YELLOW: {
    icon: TriangleAlert,
    card: "border-warning bg-warning-subtle text-warning-subtle-foreground",
    icon_: "text-warning",
  },
  RED: {
    icon: CircleX,
    card: "border-danger bg-danger-subtle text-danger-subtle-foreground",
    icon_: "text-danger",
  },
};

type Props = {
  outcome: Outcome;
  visa: { code: string; nameKey: string };
  /** Rule messageKey (or the needs-review key). */
  messageKey: string;
  className?: string;
};

/**
 * STANDARD v2 3.2 / 3.4 OutcomeCard. Order: ① icon + label ② VisaLabel ③ rule message
 * ④ "참고용, 행정사 확인 필요" (always — there is no prop to hide it, BR-11) ⑤ "상담 신청".
 * Color is never the only signal: icon + text label always.
 */
export function OutcomeCard({ outcome, visa, messageKey, className }: Props) {
  const t = useTranslations();
  const style = STYLE[outcome];
  const Icon = style.icon;

  return (
    <article
      data-testid="outcome-card"
      data-outcome={outcome}
      className={cn("vj-panel-in grid gap-4 rounded-md border p-6 shadow-1", style.card, className)}
    >
      <div className="flex items-center gap-3.5">
        <span className="grid size-13 flex-none place-items-center rounded-md bg-white">
          <Icon aria-hidden="true" strokeWidth={1.5} className={cn("size-6", style.icon_)} />
        </span>
        <h3 className="text-h3 text-navy">{t(`visa.outcome.${outcome}`)}</h3>
      </div>
      <VisaLabel code={visa.code} nameKey={visa.nameKey} className="text-dense text-navy" />
      <p className="text-dense">{t(messageKey)}</p>
      <p className="text-caption font-semibold" data-testid="reference-disclaimer">
        {t(REFERENCE_DISCLAIMER_KEY)}
      </p>
      <div>
        <Button asChild size="sm">
          <Link href={CONSULT_HREF}>
            {t("common.consult")}
            <ArrowRight aria-hidden="true" strokeWidth={1.5} data-icon="trailing" />
          </Link>
        </Button>
      </div>
    </article>
  );
}
