import type { RuleStatus } from "@prisma/client";
import { Archive, CircleDot, PencilLine, ShieldAlert } from "lucide-react";

import { RULE_STATUS_LABEL } from "@/app/admin/_i18n/ko";
import { Badge } from "@/components/ui/badge";

const ICON = { DRAFT: PencilLine, PUBLISHED: CircleDot, RETIRED: Archive } as const;
const VARIANT = { DRAFT: "neutral", PUBLISHED: "cyan", RETIRED: "outline" } as const;

/** 규칙·점수표 버전 상태 배지 (icon + text, S-09). */
export function RuleStatusBadge({ status }: { status: RuleStatus }) {
  const Icon = ICON[status];
  return (
    <Badge variant={VARIANT[status]} data-status={status}>
      <Icon aria-hidden="true" strokeWidth={1.5} />
      {RULE_STATUS_LABEL[status]}
    </Badge>
  );
}

/** Seed SAMPLE rows (BR-12): never publishable until a person enters real values. */
export function SampleBadge() {
  return (
    <Badge variant="orange" data-testid="sample-badge">
      <ShieldAlert aria-hidden="true" strokeWidth={1.5} />
      샘플 · 실제 기준 아님
    </Badge>
  );
}
