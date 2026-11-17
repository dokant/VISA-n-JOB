import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  SEEKER_GRADE_LABEL,
  VISA_CASE_STATUS_LABEL,
  VISA_CASE_TYPE_LABEL,
  fmtDateTime,
  fmtMonth,
  fmtWon,
  isoDay,
} from "@/app/admin/_i18n/ko";
import { ForbiddenNotice } from "@/components/admin/forbidden-notice";
import { VisaCaseEditForm } from "@/components/admin/visa-case-forms";
import { requireStaff } from "@/lib/admin/session";
import { getVisaCase } from "@/lib/admin/visaCases";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export const metadata: Metadata = { title: "체류 사건 상세" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

const link =
  "inline-flex min-h-11 min-w-11 items-center font-semibold text-brand-blue-700 hover:underline";

/**
 * /admin/visa-cases/[id] — 체류 사건 상세 (R-216). STAFF_PLACEMENT는 거부(WO §11 직원 권한 분리):
 * 페이지 첫 문장 뒤 `visaCase:view` 확인 → 안내만 보이고, 조회 함수(getVisaCase)도 권한을 다시 검사한다.
 */
export default async function VisaCaseDetailPage({ params }: Props) {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  if (!can(actor.role, "visaCase:view")) {
    return (
      <ForbiddenNotice text="체류 사건 상세는 행정사 담당 직원과 관리자만 볼 수 있습니다(직원 권한 분리)." />
    );
  }
  const { id } = await params;
  const c = await getVisaCase(actor, id);
  if (!c) notFound();
  const visas = await db.visaType.findMany({
    where: { active: true, isStatusCode: true },
    orderBy: { sortOrder: "asc" },
    select: { code: true },
  });

  return (
    <div className="grid gap-8" data-testid="admin-visa-case">
      <div className="grid gap-2">
        <Link href="/admin/visa-cases" className={link}>
          체류 사건 목록으로
        </Link>
        <h1 className="text-h2 text-navy">
          {VISA_CASE_TYPE_LABEL[c.caseType] ?? c.caseType}
          {c.targetVisa ? ` → ${c.targetVisa}` : ""}
        </h1>
        <dl className="grid gap-1 text-dense text-n700">
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-n500">구직자</dt>
            <dd>
              <Link href={`/admin/seekers/${c.seekerId}`} className={link}>
                구직자 등급 {SEEKER_GRADE_LABEL[c.seeker.grade]} · {c.seeker.visaCode ?? "—"} · 체류
                만료 {fmtMonth(c.seeker.stayExpiry)}
              </Link>
            </dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-n500">진행 상태</dt>
            <dd data-testid="visa-case-status">{VISA_CASE_STATUS_LABEL[c.status] ?? c.status}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-n500">수임료</dt>
            <dd>{fmtWon(c.fee)}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-n500">등록 · 수정</dt>
            <dd>
              {fmtDateTime(c.createdAt)} · {fmtDateTime(c.updatedAt)}
            </dd>
          </div>
        </dl>
      </div>

      {can(actor.role, "visaCase:manage") ? (
        <section className="grid gap-4" aria-labelledby="visa-case-edit">
          <h2 id="visa-case-edit" className="text-h3 text-navy">
            수정
          </h2>
          <VisaCaseEditForm
            visaCaseId={c.id}
            visaOptions={visas.map((v) => ({ code: v.code, label: v.code }))}
            values={{
              caseType: c.caseType,
              targetVisa: c.targetVisa ?? "",
              status: c.status,
              companyId: c.companyId ?? "",
              mandateSignedAt: isoDay(c.mandateSignedAt),
              fee: c.fee ?? "",
            }}
          />
        </section>
      ) : null}
    </div>
  );
}
