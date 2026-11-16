import { ArrowRight, Clock } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Where every "상담 신청" goes for now: the operator contact block on /about (PRD has no consult route). */
export const CONSULT_HREF = "/about#contact";

type Props = {
  title?: string;
  description?: string;
  className?: string;
};

/**
 * STANDARD v2 3.2 ComingSoon: flag off (SC-07) or unpublished table (R-127) → "준비 중" + 설명 +
 * "상담 신청". n50 panel, 22px radius, 52px icon tile + Clock, title text-h3 navy, description
 * text-dense n500, default (navy) button.
 */
export function ComingSoon({ title, description, className }: Props) {
  const t = useTranslations("common");
  return (
    <section
      data-testid="coming-soon"
      className={cn(
        "flex flex-col items-start gap-5 rounded-lg border border-n200 bg-n50 p-6.5 md:p-8",
        className,
      )}
    >
      <span className="grid size-13 place-items-center rounded-md border border-n200 bg-white text-navy">
        <Clock aria-hidden="true" strokeWidth={1.5} className="size-6" />
      </span>
      <div className="grid gap-2">
        <h2 className="text-h3 text-navy">{title ?? t("comingSoon.title")}</h2>
        <p className="max-w-150 text-dense text-n500">
          {description ?? t("comingSoon.description")}
        </p>
      </div>
      <Button asChild>
        <Link href={CONSULT_HREF}>
          {t("consult")}
          <ArrowRight aria-hidden="true" strokeWidth={1.5} data-icon="trailing" />
        </Link>
      </Button>
    </section>
  );
}
