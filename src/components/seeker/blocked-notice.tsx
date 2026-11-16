import { ArrowRight, CircleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { CONSULT_HREF } from "@/components/common/coming-soon";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/**
 * BR-08 / R-109 / SC-02: registration cannot be completed with this visa (B-1, B-2, C-3, 모름·기타),
 * an expired stay or no visa. Guides to a consult instead (WO §7.4 last row).
 */
export function BlockedNotice({ reason }: { reason?: string }) {
  const t = useTranslations("seeker.register.blocked");
  const reasonKey =
    reason === "STAY_EXPIRED" ? "expired" : reason === "NO_VISA" ? "noVisa" : "notRegistrable";
  return (
    <section
      role="alert"
      className="grid gap-3 rounded-md border border-warning bg-warning-subtle p-5 text-warning-subtle-foreground"
      data-testid="registration-blocked"
      data-reason={reason ?? "VISA_NOT_REGISTRABLE"}
    >
      <p className="flex items-start gap-2 text-body font-semibold">
        <CircleAlert aria-hidden="true" strokeWidth={1.5} className="mt-1 size-5 flex-none" />
        {t("title")}
      </p>
      <p className="text-dense">{t(reasonKey)}</p>
      <div>
        <Button asChild variant="default">
          <Link href={CONSULT_HREF} data-testid="blocked-consult">
            {t("cta")}
            <ArrowRight aria-hidden="true" strokeWidth={1.5} />
          </Link>
        </Button>
      </div>
    </section>
  );
}
