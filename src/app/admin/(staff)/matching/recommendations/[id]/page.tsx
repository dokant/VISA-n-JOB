import { FileCheck, FileX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  INTERVIEW_CONSENT_LABEL,
  INTERVIEW_RESULT_LABEL,
  INTERVIEW_STATUS_LABEL,
  SEEKER_GRADE_LABEL,
  SIGNED_URL_NOTE,
  fmtDateTime,
} from "@/app/admin/_i18n/ko";
import { ForbiddenNotice } from "@/components/admin/forbidden-notice";
import {
  InterviewCreateForm,
  InterviewResultForm,
  InterviewStatusForms,
  IntroConfirmOpenButton,
  IntroConfirmUploadForm,
} from "@/components/admin/matching-forms";
import { Badge } from "@/components/ui/badge";
import { requireStaff } from "@/lib/admin/session";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { listInterviews } from "@/lib/recommendations/interviews";
import { findRecommendation } from "@/lib/recommendations/ledger";

export const metadata: Metadata = { title: "추천 · 면접 일정" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

const link =
  "inline-flex min-h-11 min-w-11 items-center font-semibold text-brand-blue-700 hover:underline";

function consentState(iv: Awaited<ReturnType<typeof listInterviews>>[number]) {
  if (iv.status !== "CONFIRMED") return "NOT_ASKED" as const;
  if (iv.consents.some((c) => c.revokedAt === null)) return "AGREED" as const;
  return iv.consentDeclinedAt ? ("DECLINED" as const) : ("PENDING" as const);
}

/**
 * /admin/matching/recommendations/[id] — 추천 원장 1건과 면접 일정 (R-209, R-210, R-211).
 * 원장 행은 읽기만 한다(BR-09). 면접 확정 → 구직자에게 건별 이름 제공 동의 요청(PC-1). 소개 확인서는
 * 비공개 저장소에 두고 5분 서명 링크로만 연다. 권한 `interview:manage`(매칭 담당·관리자).
 */
export default async function RecommendationPage({ params }: Props) {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  if (!can(actor.role, "interview:manage")) {
    return <ForbiddenNotice text="면접 일정은 매칭 담당 직원과 관리자만 관리합니다." />;
  }
  const { id } = await params;
  const rec = await findRecommendation(id, {
    id: true,
    recommendedAt: true,
    note: true,
    seekerId: true,
    seeker: { select: { grade: true, visaCode: true } },
    company: { select: { industryCode: true, sido: true } },
    posting: { select: { id: true, blindTitle: true } },
    staff: { select: { displayName: true } },
  });
  if (!rec) notFound();
  const [interviews, sido, industry] = await Promise.all([
    listInterviews(rec.id),
    db.region.findUnique({ where: { code: rec.company.sido }, select: { nameKo: true } }),
    db.industry.findUnique({ where: { code: rec.company.industryCode }, select: { nameKo: true } }),
  ]);

  return (
    <div className="grid gap-8" data-testid="admin-recommendation">
      <div className="grid gap-2">
        <Link href="/admin/matching" className={link}>
          매칭으로
        </Link>
        <h1 className="text-h2 text-navy">추천 · 면접 일정</h1>
        <dl className="grid gap-1 text-dense text-n700">
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-n500">추천 시각</dt>
            <dd>
              {fmtDateTime(rec.recommendedAt)} · 직원 {rec.staff.displayName ?? "—"}
            </dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-n500">구직자</dt>
            <dd>
              <Link href={`/admin/seekers/${rec.seekerId}`} className={link}>
                구직자 등급 {SEEKER_GRADE_LABEL[rec.seeker.grade]} · {rec.seeker.visaCode ?? "—"}
              </Link>
            </dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-n500">기업</dt>
            <dd>
              {industry?.nameKo ?? rec.company.industryCode} · {sido?.nameKo ?? rec.company.sido}
              {rec.posting ? ` · 공고 ${rec.posting.blindTitle}` : " · 공고 없이 추천"}
            </dd>
          </div>
          {rec.note ? (
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-n500">직원 메모</dt>
              <dd className="break-words">{rec.note}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <section className="grid gap-4" aria-labelledby="interviews">
        <h2 id="interviews" className="text-h3 text-navy">
          면접
        </h2>
        <p className="text-caption text-n500">{SIGNED_URL_NOTE}</p>
        {interviews.length === 0 ? (
          <p className="text-dense text-n500">아직 면접 일정이 없습니다.</p>
        ) : (
          <ul className="grid gap-4" data-testid="interview-list">
            {interviews.map((iv) => {
              const consent = consentState(iv);
              return (
                <li
                  key={iv.id}
                  className="grid gap-4 rounded-md border border-border bg-white p-5 shadow-1"
                  data-testid="interview-item"
                  data-interview-id={iv.id}
                  data-status={iv.status}
                  data-consent={consent}
                >
                  <dl className="grid gap-1 text-dense">
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="text-n500">일시</dt>
                      <dd className="font-semibold text-navy">{fmtDateTime(iv.scheduledAt)}</dd>
                    </div>
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="text-n500">장소(기업에 보임)</dt>
                      <dd className="break-words">{iv.place}</dd>
                    </div>
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="text-n500">통역(직원 전용)</dt>
                      <dd>{iv.interpreter ?? "—"}</dd>
                    </div>
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="text-n500">상태</dt>
                      <dd>{INTERVIEW_STATUS_LABEL[iv.status] ?? iv.status}</dd>
                    </div>
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="text-n500">이름 제공 동의</dt>
                      <dd data-testid="interview-consent-state">
                        {INTERVIEW_CONSENT_LABEL[consent]}
                      </dd>
                    </div>
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="text-n500">결과</dt>
                      <dd>
                        {iv.attended === null ? "참석 미입력" : iv.attended ? "참석" : "불참"} ·{" "}
                        {iv.result
                          ? (INTERVIEW_RESULT_LABEL[iv.result] ?? iv.result)
                          : "결과 미입력"}
                      </dd>
                    </div>
                  </dl>
                  <InterviewStatusForms
                    interviewId={iv.id}
                    recommendationId={rec.id}
                    status={iv.status}
                  />
                  <InterviewResultForm
                    interviewId={iv.id}
                    recommendationId={rec.id}
                    attended={iv.attended}
                    result={iv.result}
                  />
                  <div className="grid gap-3 border-t border-n100 pt-4">
                    {iv.introConfirmFile ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="blue" data-testid="intro-uploaded">
                          <FileCheck aria-hidden="true" strokeWidth={1.5} />
                          소개 확인서 {fmtDateTime(iv.introConfirmUploadedAt)}
                        </Badge>
                        <IntroConfirmOpenButton interviewId={iv.id} />
                      </div>
                    ) : (
                      <Badge variant="outline">
                        <FileX aria-hidden="true" strokeWidth={1.5} />
                        소개 확인서 없음
                      </Badge>
                    )}
                    <IntroConfirmUploadForm interviewId={iv.id} recommendationId={rec.id} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="grid gap-4" aria-labelledby="interview-new">
        <h2 id="interview-new" className="text-h3 text-navy">
          새 면접 일정
        </h2>
        <InterviewCreateForm recommendationId={rec.id} />
      </section>
    </div>
  );
}
