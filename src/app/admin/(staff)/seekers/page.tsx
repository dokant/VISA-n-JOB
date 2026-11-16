import type { Metadata } from "next";
import Link from "next/link";

import {
  SEEKER_GRADE_LABEL,
  SEEKER_STATUS_LABEL,
  TRACK_LABEL,
  fmtDate,
  fmtMonth,
} from "@/app/admin/_i18n/ko";
import { ADMIN_LIST_MAX } from "@/config/limits";
import { requireStaff } from "@/lib/admin/session";
import { REVIEW_QUEUES, type ReviewQueue, listSeekersForReview } from "@/lib/admin/seekerReview";
import { assertCan } from "@/lib/rbac";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "구직자 검토" };
export const dynamic = "force-dynamic";

const QUEUE_LABEL: Record<ReviewQueue, string> = {
  NEW: "신규 (상담 전)",
  B: "B등급",
  A: "A등급",
  S: "S등급",
  ALL: "전체",
};

/** /admin/seekers — 구직자 검토 큐 (R-120). 목록에는 복호 필드를 보이지 않는다(R-122). */
export default async function SeekerQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ queue?: string }>;
}) {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "seeker:view");
  const { queue: raw } = await searchParams;
  const queue: ReviewQueue = (REVIEW_QUEUES as readonly string[]).includes(raw ?? "")
    ? (raw as ReviewQueue)
    : "NEW";
  const { rows, total } = await listSeekersForReview(queue, { take: ADMIN_LIST_MAX });

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="text-h2 text-navy">구직자 검토</h1>
        <p className="text-dense text-n700">
          구직자 등급 승격(B→A→S)·트랙 변경·전환 가능성 판정은 비자 담당 직원과 관리자만 할 수
          있습니다.
        </p>
      </div>
      <nav aria-label="검토 큐" className="flex flex-wrap gap-2">
        {REVIEW_QUEUES.map((q) => (
          <Link
            key={q}
            href={`/admin/seekers?queue=${q}`}
            aria-current={q === queue ? "page" : undefined}
            className={cn(
              "inline-flex h-11 items-center rounded-full border border-n200 bg-white px-4 text-dense font-semibold text-n700 hover:text-navy",
              q === queue && "border-navy bg-navy text-white hover:text-white",
            )}
          >
            {QUEUE_LABEL[q]}
          </Link>
        ))}
      </nav>
      <p className="text-dense text-n700" data-testid="seeker-total">
        {total}명{total > rows.length ? ` 중 최근 ${rows.length}명` : ""}
      </p>
      <div className="overflow-x-auto rounded-md border border-n200 bg-white">
        <table className="w-full min-w-3xl text-left text-dense" data-testid="seeker-table">
          <thead className="bg-n50 text-label font-semibold text-n700">
            <tr>
              <th className="px-4 py-3">구직자</th>
              <th className="px-4 py-3">비자</th>
              <th className="px-4 py-3">체류 만료</th>
              <th className="px-4 py-3">구직자 등급</th>
              <th className="px-4 py-3">트랙</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">등록일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-n100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-n500">
                  해당하는 구직자가 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/seekers/${s.id}`}
                      className="inline-flex min-h-11 items-center font-semibold text-navy underline-offset-4 hover:underline"
                      data-testid="seeker-link"
                    >
                      #{s.publicId.slice(0, 8)}
                    </Link>
                    <span className="ms-2 text-n500">{s.nationality ?? "—"}</span>
                  </td>
                  <td className="px-4 py-2 tabular-nums">{s.visaCode ?? "—"}</td>
                  <td className="px-4 py-2 tabular-nums">{fmtMonth(s.stayExpiry)}</td>
                  <td className="px-4 py-2">{SEEKER_GRADE_LABEL[s.grade]}</td>
                  <td className="px-4 py-2">{s.track ? TRACK_LABEL[s.track] : "—"}</td>
                  <td className="px-4 py-2">{SEEKER_STATUS_LABEL[s.status]}</td>
                  <td className="px-4 py-2 tabular-nums">{fmtDate(s.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
