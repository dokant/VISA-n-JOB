import type { Metadata } from "next";
import Link from "next/link";

import {
  LEAD_COLUMN_HINT,
  LEAD_COLUMN_TITLE,
  LEAD_GRADE_LABEL,
  LEAD_NO_COMPANY,
  LEAD_NO_TITLE,
  LEAD_SOURCE_LABEL,
  fmtDate,
} from "@/app/admin/_i18n/ko";
import { ForbiddenNotice } from "@/components/admin/forbidden-notice";
import { Badge } from "@/components/ui/badge";
import { LEAD_PRIORITY_WEIGHTS } from "@/config/limits";
import { buildLeadBoard, openLeadReviewTasks } from "@/lib/admin/leadDesk";
import { requireStaff } from "@/lib/admin/session";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export const metadata: Metadata = { title: "리드 칸반" };
export const dynamic = "force-dynamic";

/**
 * /admin/leads — 리드 칸반 (R-121). 열마다 전화 우선순위 내림차순, 카드에 "대기 인력 n명".
 * 리드 제목·회사명은 수집 단계에서 연락처를 가린 값이다(P1d). 연락처 원문은 상세 화면의 열람
 * 버튼으로만 본다(R-122).
 */
export default async function LeadBoardPage() {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  if (!can(actor.role, "lead:manage")) {
    return <ForbiddenNotice text="리드 칸반은 매칭 담당 직원과 관리자만 볼 수 있습니다." />;
  }
  const now = new Date();
  const [columns, reviews, regions, industries] = await Promise.all([
    buildLeadBoard(now),
    openLeadReviewTasks(),
    db.region.findMany({ where: { level: "SIDO" }, select: { code: true, nameKo: true } }),
    db.industry.findMany({ select: { code: true, nameKo: true } }),
  ]);
  const regionName = new Map(regions.map((r) => [r.code, r.nameKo]));
  const industryName = new Map(industries.map((r) => [r.code, r.nameKo]));
  const w = LEAD_PRIORITY_WEIGHTS;

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="text-h2 text-navy">리드 칸반</h1>
        <p className="text-dense text-n700">
          각 열은 전화 우선순위가 높은 순입니다. 우선순위 = (조건에 맞는 S·A등급 대기 인력, S{" "}
          {w.seekerGrade.S}· A {w.seekerGrade.A}점) × {w.matchMultiplier} + 인구감소지역{" "}
          {w.depopulationBonus} + {w.newLeadDays}일 이내 신규 {w.newLeadBonus}. 가중치는 운영자가
          조정하는 설정값입니다.
        </p>
      </div>

      {reviews.length > 0 ? (
        <section
          id="lead-review"
          aria-labelledby="lead-review-title"
          className="grid gap-3 rounded-md border border-n200 bg-white p-6"
        >
          <h2 id="lead-review-title" className="text-ui font-semibold text-navy">
            리드 검증 대기 {reviews.length}건
          </h2>
          <ul className="grid gap-1" data-testid="lead-review-tasks">
            {reviews.map((t) =>
              t.lead ? (
                <li key={t.id}>
                  <Link
                    href={`/admin/leads/${t.lead.id}`}
                    className="inline-flex min-h-11 items-center gap-2 text-dense text-navy underline-offset-4 hover:underline"
                  >
                    {t.lead.title ?? LEAD_NO_TITLE} · {t.lead.companyName ?? LEAD_NO_COMPANY} · 리드
                    등급 {LEAD_GRADE_LABEL[t.lead.grade]}
                    <span className="text-n500">({fmtDate(t.createdAt)} 접수)</span>
                  </Link>
                </li>
              ) : null,
            )}
          </ul>
        </section>
      ) : null}

      <div className="overflow-x-auto pb-2" data-testid="lead-board">
        <div className="grid min-w-5xl grid-cols-5 gap-4">
          {columns.map((col) => (
            <section
              key={col.grade}
              aria-labelledby={`col-${col.grade}`}
              className="grid content-start gap-3 rounded-md bg-n100 p-3"
              data-testid={`lead-col-${col.grade}`}
            >
              <header className="grid gap-0.5 px-1">
                <h2 id={`col-${col.grade}`} className="text-ui font-semibold text-navy">
                  {LEAD_COLUMN_TITLE[col.grade]}{" "}
                  <span
                    className="tabular-nums text-n700"
                    data-testid={`lead-col-count-${col.grade}`}
                  >
                    {col.total}
                  </span>
                </h2>
                <p className="text-caption text-n500">{LEAD_COLUMN_HINT[col.grade]}</p>
              </header>
              {col.cards.length === 0 ? (
                <p className="px-1 text-caption text-n500">리드 없음</p>
              ) : (
                <ol className="grid gap-2">
                  {col.cards.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/admin/leads/${c.id}`}
                        className="grid gap-1.5 rounded-sm border border-border bg-white p-3 shadow-1 transition-[border-color,box-shadow] hover:border-brand-blue/30 hover:shadow-2"
                        data-testid="lead-card"
                        data-lead-id={c.id}
                        data-priority={c.priority}
                      >
                        <span className="text-dense font-semibold text-navy">
                          {c.title ?? LEAD_NO_TITLE}
                        </span>
                        <span className="text-caption text-n700">
                          {c.companyName ?? LEAD_NO_COMPANY}
                        </span>
                        <span className="text-caption text-n500">
                          {regionName.get(c.sido) ?? c.sido}
                          {c.industryCode
                            ? ` · ${industryName.get(c.industryCode) ?? c.industryCode}`
                            : ""}
                          {` · ${LEAD_SOURCE_LABEL[c.source] ?? c.source}`}
                        </span>
                        <span className="flex flex-wrap gap-1.5">
                          <Badge variant="solid">우선순위 {c.priority}</Badge>
                          <Badge variant="blue">대기 인력 {c.waiting}명</Badge>
                          {c.depopulationArea ? <Badge variant="cyan">인구감소지역</Badge> : null}
                          {c.openReview ? <Badge variant="orange">검증 대기</Badge> : null}
                        </span>
                        {c.nextActionAt ? (
                          <span className="text-caption text-n500">
                            다음 연락 {fmtDate(c.nextActionAt)}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
              {col.total > col.cards.length ? (
                <p className="px-1 text-caption text-n500">
                  상위 {col.cards.length}건만 표시합니다.
                </p>
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
