import { FileWarning } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/**
 * STANDARD v2 3.2 ExpertReviewMark: "[전문가 검토 필요]" right under the title of every legal draft
 * (N-03). SC-08: on non-Korean pages the Korean original is shown together with the translation.
 * Orange badge + FileWarning, text-caption. Server component.
 */
export async function ExpertReviewMark({ className }: Props) {
  const locale = await getLocale();
  const t = await getTranslations("common.expertReview");
  const tKo = await getTranslations({ locale: "ko", namespace: "common.expertReview" });
  const koLabel = tKo("label");
  const label = t("label");

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)} data-testid="expert-review">
      <Badge variant="orange" className="flex-wrap text-caption tracking-normal">
        <FileWarning aria-hidden="true" strokeWidth={1.5} />
        <span lang="ko">{koLabel}</span>
        {locale !== "ko" ? <span>{label}</span> : null}
      </Badge>
      <span className="text-caption text-n500">{t("draftNote")}</span>
    </div>
  );
}
