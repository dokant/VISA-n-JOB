import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import {
  LEAD_GRADE_LABEL,
  LEAD_NO_COMPANY,
  LEAD_NO_TITLE,
  fmtCount,
  fmtDateTime,
  fmtPeople,
  fmtWon,
  postingCodeLabel,
} from "@/app/admin/_i18n/ko";
import { ForbiddenNotice } from "@/components/admin/forbidden-notice";
import { PostingStatusBadge, PostingVerifiedBadge } from "@/components/admin/posting-badges";
import {
  ClosePostingForm,
  PublishPostingForm,
  VerifyPostingForm,
} from "@/components/admin/posting-forms";
import { requireStaff } from "@/lib/admin/session";
import { db } from "@/lib/db";
import { getAdminPosting } from "@/lib/postings/manage";
import { can } from "@/lib/rbac";

export const metadata: Metadata = { title: "블라인드 공고 상세" };
export const dynamic = "force-dynamic";

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5">
      <dt className="text-dense text-n700">{label}</dt>
      <dd className="col-span-2 text-dense break-words text-navy">{value}</dd>
    </div>
  );
}

/** /admin/postings/[id] — 블라인드 공고 상세 · 검증 · 공개 · 마감 (R-201). */
export default async function PostingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  if (!can(actor.role, "posting:manage")) {
    return <ForbiddenNotice text="블라인드 공고는 매칭 담당 직원과 관리자만 관리합니다." />;
  }
  const { id } = await params;
  const p = await getAdminPosting(id);
  if (!p) notFound();
  const [sido, sigungu, industry, verifier] = await Promise.all([
    db.region.findUnique({ where: { code: p.sido }, select: { nameKo: true } }),
    p.sigungu
      ? db.region.findUnique({ where: { code: p.sigungu }, select: { nameKo: true } })
      : Promise.resolve(null),
    db.industry.findUnique({ where: { code: p.industryCode }, select: { nameKo: true } }),
    p.verifiedBy
      ? db.user.findUnique({ where: { id: p.verifiedBy }, select: { displayName: true } })
      : Promise.resolve(null),
  ]);
  const leadIsA = p.lead?.grade === "A";

  return (
    <div className="grid gap-6" data-testid="posting-detail">
      <div className="grid gap-2">
        <Link
          href="/admin/postings"
          className="inline-flex min-h-11 min-w-11 items-center text-dense text-n700 hover:text-navy"
        >
          ← 블라인드 공고
        </Link>
        <h1 className="text-h2 break-words text-navy">{p.blindTitle}</h1>
        <p className="flex flex-wrap items-center gap-2">
          <PostingStatusBadge status={p.status} data-testid="posting-status" />
          <PostingVerifiedBadge verified={Boolean(p.verifiedAt)} data-testid="posting-verified" />
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          className="grid content-start gap-4 rounded-md border border-border bg-white p-6 shadow-1"
          aria-labelledby="posting-public-values"
        >
          <h2 id="posting-public-values" className="text-ui font-semibold text-navy">
            공개되는 내용 (WO §8.5 표시 항목)
          </h2>
          <dl className="divide-y divide-n100">
            <Field label="블라인드 제목" value={p.blindTitle} />
            <Field
              label="지역"
              value={[sido?.nameKo ?? p.sido, sigungu?.nameKo].filter(Boolean).join(" ")}
            />
            <Field label="업종" value={industry?.nameKo ?? p.industryCode} />
            <Field label="직무" value={p.role} />
            <Field
              label="월 급여(세전)"
              value={
                p.payMax != null
                  ? `${fmtWon(p.payMin)} ~ ${fmtWon(p.payMax)}`
                  : `${fmtWon(p.payMin)} 이상`
              }
            />
            <Field label="잔업" value={postingCodeLabel("overtimeNote", p.overtimeNote)} />
            <Field label="숙소" value={postingCodeLabel("dormitory", p.dormitory)} />
            <Field label="식사" value={postingCodeLabel("meals", p.meals)} />
            <Field label="교대" value={postingCodeLabel("shift", p.shift)} />
            <Field label="채용 인원" value={fmtPeople(p.headcount)} />
            <Field label="채용 가능 비자" value={p.eligibleVisas.join(", ")} />
          </dl>
        </section>

        <section
          className="grid content-start gap-4 rounded-md border border-border bg-white p-6 shadow-1"
          aria-labelledby="posting-steps"
        >
          <h2 id="posting-steps" className="text-ui font-semibold text-navy">
            검증 · 공개
          </h2>
          <dl className="divide-y divide-n100">
            <Field
              label="원본 리드"
              value={
                p.lead ? (
                  <Link
                    href={`/admin/leads/${p.lead.id}`}
                    className="inline-flex min-h-11 min-w-11 items-center font-semibold text-brand-blue-700 hover:underline"
                  >
                    {p.lead.title ?? LEAD_NO_TITLE} · {p.lead.companyName ?? LEAD_NO_COMPANY} (리드
                    등급 {LEAD_GRADE_LABEL[p.lead.grade]})
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <Field
              label="검증"
              value={
                p.verifiedAt
                  ? `${fmtDateTime(p.verifiedAt)} · ${verifier?.displayName ?? "직원"}`
                  : "전"
              }
            />
            <Field label="공개" value={fmtDateTime(p.publishedAt)} />
            <Field label="마감" value={fmtDateTime(p.closedAt)} />
            <Field label="면접 신청" value={fmtCount(p._count.interestRequests, "건")} />
          </dl>
          {!leadIsA && p.status !== "CLOSED" ? (
            <p className="text-dense text-error-text" role="note">
              원본 리드가 리드 등급 A가 아니어서 공개할 수 없고, 공개 중이어도 화면에 나오지
              않습니다.
            </p>
          ) : null}
          {p.status === "DRAFT" ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <p className="text-dense text-n700">
                  구인신청 내용과 공고 문구를 확인했으면 검증 완료로 기록합니다(검증자·검증 시각).
                </p>
                <VerifyPostingForm postingId={p.id} />
              </div>
              <div className="grid gap-2 border-t border-n100 pt-4">
                <p className="text-dense text-n700">
                  검증이 끝난 공고만 공개됩니다. 공개하면 감사 로그(공고 공개)가 남습니다.
                </p>
                <PublishPostingForm postingId={p.id} />
              </div>
            </div>
          ) : null}
          {p.status !== "CLOSED" ? (
            <div className="border-t border-n100 pt-4">
              <ClosePostingForm postingId={p.id} />
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
