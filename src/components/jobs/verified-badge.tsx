import { BadgeCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";

/**
 * STANDARD v2 3.2 VerifiedBadge: "검증 완료" + BadgeCheck, cyan badge. Shown only on postings the
 * public query returned (PUBLISHED + verifiedAt, WO §8.5).
 */
export function VerifiedBadge() {
  const t = useTranslations("public.jobs");
  return (
    <Badge variant="cyan" data-testid="verified-badge" className="gap-1.5">
      <BadgeCheck aria-hidden="true" strokeWidth={1.5} className="size-4" />
      {t("verified")}
    </Badge>
  );
}
