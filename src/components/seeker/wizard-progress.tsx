import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { Progress } from "@/components/ui/progress";
import { WIZARD_LAST_STEP } from "@/lib/seeker/options";

/**
 * STANDARD v2 3.2 WizardProgress: sticky under the nav, bar + "n/7 · 단계명" together (SC-03:
 * denominator 7, Step 0 not counted), aria-valuenow / max on the bar, "자동 저장됨" state.
 */
export function WizardProgress({
  step,
  stepName,
  saved,
}: {
  /** 1..7 (Step 0 shows 0) */
  step: number;
  stepName: string;
  saved: boolean;
}) {
  const t = useTranslations("seeker.register.progress");
  return (
    <div
      className="sticky top-16 z-30 border-b border-navy/8 bg-white/82 backdrop-blur-xl md:top-19"
      data-testid="wizard-progress"
    >
      <div className="mx-auto grid max-w-180 gap-2 px-gutter py-3 box-content">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-caption font-semibold text-n700">
            <span data-testid="wizard-progress-count">
              {t("count", { step, total: WIZARD_LAST_STEP })}
            </span>
            <span aria-hidden="true" className="mx-1">
              ·
            </span>
            <span className="text-navy">{stepName}</span>
          </p>
          {saved ? (
            <p
              className="flex items-center gap-1 text-caption text-n500"
              data-testid="wizard-saved"
            >
              <Check aria-hidden="true" strokeWidth={2} className="size-3.5" />
              {t("saved")}
            </p>
          ) : null}
        </div>
        <Progress
          value={step}
          max={WIZARD_LAST_STEP}
          aria-label={t("label")}
          aria-valuetext={t("count", { step, total: WIZARD_LAST_STEP })}
        />
      </div>
    </div>
  );
}
