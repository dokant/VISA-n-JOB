import { ArrowRight, CircleCheck, CircleX, Clock } from "lucide-react";

import { CONSULT_HREF } from "@/components/common/coming-soon";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const ICON = {
  done: CircleCheck,
  answered: CircleCheck,
  expired: Clock,
  invalid: CircleX,
} as const;

/**
 * Result panel of the "아직 구직 중이세요?" page (R-213): done / already answered / expired / invalid.
 * Icon + text (never color alone, STANDARD 3.3); expired and invalid offer "상담 신청".
 */
export function StillSearchingNotice({
  kind,
  title,
  body,
  consultLabel,
}: {
  kind: keyof typeof ICON;
  title: string;
  body: string;
  consultLabel?: string;
}) {
  const Icon = ICON[kind];
  const good = kind === "done" || kind === "answered";
  return (
    <section
      role="status"
      data-testid="still-searching-result"
      data-kind={kind}
      className={cn(
        "flex flex-col items-start gap-5 rounded-lg border p-6.5 md:p-8",
        good ? "border-n200 bg-success-subtle" : "border-n200 bg-n50",
      )}
    >
      <span className="grid size-13 place-items-center rounded-md border border-n200 bg-white text-navy">
        <Icon aria-hidden="true" strokeWidth={1.5} className="size-6" />
      </span>
      <div className="grid gap-2">
        <h2 className="text-h3 text-navy">{title}</h2>
        <p className="max-w-150 text-dense text-n700">{body}</p>
      </div>
      {consultLabel ? (
        <Button asChild>
          <Link href={CONSULT_HREF}>
            {consultLabel}
            <ArrowRight aria-hidden="true" strokeWidth={1.5} data-icon="trailing" />
          </Link>
        </Button>
      ) : null}
    </section>
  );
}
