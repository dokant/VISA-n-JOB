import type { Metadata } from "next";
import Link from "next/link";

import { FEE_STATUS_LABEL, fmtDate, fmtDateTime, fmtWon, isoDay } from "@/app/admin/_i18n/ko";
import { ForbiddenNotice } from "@/components/admin/forbidden-notice";
import { PlacementCreateForm, PlacementEditForm } from "@/components/admin/placement-forms";
import { listPlacements, recommendationsWithoutPlacement } from "@/lib/admin/placements";
import { requireStaff } from "@/lib/admin/session";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export const metadata: Metadata = { title: "계약" };
export const dynamic = "force-dynamic";

const link =
  "inline-flex min-h-11 min-w-11 items-center font-semibold text-brand-blue-700 hover:underline";

/**
 * /admin/placements — 계약(Placement) 기본 관리 (R-216). 권한 `placement:manage`(매칭 담당·관리자).
 * 등록·수정만 있고 삭제는 없다(소개 기록 보존, WO §11 [전문가 검토 필요]). 개인정보 복호 없음.
 */
export default async function PlacementsPage() {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  if (!can(actor.role, "placement:manage")) {
    return <ForbiddenNotice text="계약 관리는 매칭 담당 직원과 관리자만 합니다." />;
  }
  const [placements, open, sidos, industries] = await Promise.all([
    listPlacements(),
    recommendationsWithoutPlacement(),
    db.region.findMany({ where: { level: "SIDO" }, select: { code: true, nameKo: true } }),
    db.industry.findMany({ select: { code: true, nameKo: true } }),
  ]);
  const sidoName = new Map(sidos.map((r) => [r.code, r.nameKo]));
  const industryName = new Map(industries.map((i) => [i.code, i.nameKo]));
  const where = (c: { industryCode: string; sido: string }) =>
    `${industryName.get(c.industryCode) ?? c.industryCode} · ${sidoName.get(c.sido) ?? c.sido}`;

  return (
    <div className="grid gap-10" data-testid="admin-placements">
      <div className="grid gap-2">
        <h1 className="text-h2 text-navy">계약</h1>
        <p className="text-dense text-n700">
          추천 뒤 근로계약이 맺어지면 계약일·월 급여·소개요금(기업 청구분)을 기록합니다. 추천 1건에
          계약 1건입니다. 구직자에게는 이용료를 받지 않습니다. 계약 기록은 지우지 않습니다.
        </p>
      </div>

      <section className="grid gap-4" aria-labelledby="placement-new">
        <h2 id="placement-new" className="text-h3 text-navy">
          계약 등록
        </h2>
        {open.length === 0 ? (
          <p className="text-dense text-n500">계약을 등록할 추천 건이 없습니다.</p>
        ) : (
          <PlacementCreateForm
            today={isoDay(new Date())}
            recommendations={open.map((r) => ({
              id: r.id,
              label: `${fmtDate(r.recommendedAt)} · ${where(r.company)}${
                r.posting ? ` · ${r.posting.blindTitle}` : ""
              }${r.interviews.some((i) => i.result === "HIRED") ? " · 채용" : ""}`,
            }))}
          />
        )}
      </section>

      <section className="grid gap-4" aria-labelledby="placement-list">
        <h2 id="placement-list" className="text-h3 text-navy">
          계약 목록
        </h2>
        {placements.length === 0 ? (
          <p className="text-dense text-n500">등록된 계약이 없습니다.</p>
        ) : (
          <ul className="grid gap-4" data-testid="placement-list">
            {placements.map((p) => (
              <li
                key={p.id}
                className="grid gap-3 rounded-md border border-border bg-white p-5 shadow-1"
                data-placement-id={p.id}
              >
                <div className="grid gap-1 text-dense text-n700">
                  <p className="font-semibold text-navy">
                    계약일 {fmtDate(p.contractDate)} · {where(p.recommendation.company)}
                    {p.recommendation.posting ? ` · ${p.recommendation.posting.blindTitle}` : ""}
                  </p>
                  <p>
                    월 급여 {fmtWon(p.monthlyWage)} · 소개요금 {fmtWon(p.feeAmount)} ·{" "}
                    {FEE_STATUS_LABEL[p.feeStatus] ?? p.feeStatus} · 수정 {fmtDateTime(p.updatedAt)}
                  </p>
                  <p>
                    <Link
                      href={`/admin/matching/recommendations/${p.recommendation.id}`}
                      className={link}
                    >
                      추천 · 면접 보기
                    </Link>
                  </p>
                </div>
                <PlacementEditForm
                  placementId={p.id}
                  values={{
                    contractDate: isoDay(p.contractDate),
                    monthlyWage: p.monthlyWage,
                    feeAmount: p.feeAmount,
                    feeStatus: p.feeStatus,
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
