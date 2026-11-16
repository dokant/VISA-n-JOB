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

type VisaRef = { code: string; nameKey: string; isStatusCode: boolean };

type Props = {
  outcome: Outcome;
  /** One visa (비자 진단) … */
  visa?: VisaRef;
  /** … or several visas with the same outcome and message (무료 채용 진단, R-124). */
  visas?: readonly VisaRef[];
  /** Rule messageKey (or the needs-review key). */
  messageKey: string;
  className?: string;
};

/**
 * STANDARD v2 3.2 / 3.4 OutcomeCard. Order: ① icon + label ② VisaLabel ③ rule message
 * ④ "참고용, 행정사 확인 필요" (always — there is no prop to hide it, BR-11) ⑤ "상담 신청".
 * Color is never the only signal: icon + text label always.
 * The 무료 채용 진단 (R-124) shows one card per outcome + message with every visa of that group in ②.
 */
export function OutcomeCard({ outcome, visa, visas, messageKey, className }: Props) {
  const t = useTranslations();
  const style = STYLE[outcome];
  const Icon = style.icon;
  const list = visas ?? (visa ? [visa] : []);

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
      {list.length === 1 ? (
        <VisaLabel
          code={list[0].code}
          nameKey={list[0].nameKey}
          showCode={list[0].isStatusCode}
          className="text-dense text-navy"
        />
      ) : (
        <ul className="flex flex-wrap gap-x-4 gap-y-2" data-testid="outcome-visas">
          {list.map((v) => (
            <li key={v.code}>
              <VisaLabel
                code={v.code}
                nameKey={v.nameKey}
                showCode={v.isStatusCode}
                className="text-dense text-navy"
              />
            </li>
          ))}
        </ul>
      )}
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
