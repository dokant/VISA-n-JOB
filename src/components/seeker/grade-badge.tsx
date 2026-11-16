import type { SeekerGrade } from "@prisma/client";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";

/**
 * STANDARD v2 3.2 GradeBadge: S = solid navy + Star + "우선 추천", A = blue, B = outline with
 * --input border and n700 text. Letter + text, never colour alone (S-09).
 */
export function GradeBadge({ grade }: { grade: SeekerGrade }) {
  const t = useTranslations("seeker.grade");
  if (grade === "S") {
    return (
      <Badge variant="solid" data-testid="grade-badge" data-grade="S">
        <Star aria-hidden="true" strokeWidth={1.5} />
        {t("label", { grade })}
        <span>{t("priority")}</span>
      </Badge>
    );
  }
  return (
    <Badge
      variant={grade === "A" ? "blue" : "outline"}
      className={grade === "B" ? "border-input text-n700" : undefined}
      data-testid="grade-badge"
      data-grade={grade}
    >
      {t("label", { grade })}
    </Badge>
  );
}
