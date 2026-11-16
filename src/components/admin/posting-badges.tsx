import type { PostingStatus } from "@prisma/client";
import { BadgeCheck, Clock, Eye, FilePen, Lock, type LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { POSTING_STATUS_LABEL } from "@/app/admin/_i18n/ko";
import { Badge } from "@/components/ui/badge";

/**
 * 관리자 블라인드 공고 상태·검증 배지 (STANDARD S-09: 공개 여부·판정 = 색 + 아이콘 + 글자, 3.2 관리자
 * 예외에서도 그대로). P2a 기준 검토 F-1.
 */
const STATUS_ICON: Record<PostingStatus, LucideIcon> = {
  DRAFT: FilePen,
  PUBLISHED: Eye,
  CLOSED: Lock,
};

export function PostingStatusBadge({
  status,
  ...props
}: { status: PostingStatus } & Omit<ComponentProps<"span">, "children">) {
  const Icon = STATUS_ICON[status];
  return (
    <Badge variant={status === "PUBLISHED" ? "cyan" : "neutral"} data-status={status} {...props}>
      <Icon aria-hidden="true" strokeWidth={1.5} />
      {POSTING_STATUS_LABEL[status]}
    </Badge>
  );
}

export function PostingVerifiedBadge({
  verified,
  ...props
}: { verified: boolean } & Omit<ComponentProps<"span">, "children">) {
  const Icon = verified ? BadgeCheck : Clock;
  return (
    <Badge variant={verified ? "blue" : "orange"} data-verified={verified} {...props}>
      <Icon aria-hidden="true" strokeWidth={1.5} />
      {verified ? "검증 완료" : "검증 전"}
    </Badge>
  );
}
