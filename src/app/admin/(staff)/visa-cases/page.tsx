import type { Metadata } from "next";
import Link from "next/link";

import {
  SEEKER_GRADE_LABEL,
  VISA_CASE_STATUS_LABEL,
  VISA_CASE_TYPE_LABEL,
  fmtDate,
  fmtDateTime,
} from "@/app/admin/_i18n/ko";
import { ForbiddenNotice } from "@/components/admin/forbidden-notice";
import { VisaCaseCreateForm } from "@/components/admin/visa-case-forms";
import { requireStaff } from "@/lib/admin/session";
import { listVisaCases } from "@/lib/admin/visaCases";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export const metadata: Metadata = { title: "체류 사건" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const cell = "px-4 py-3 text-start align-top";
const link =
  "inline-flex min-h-11 min-w-11 items-center font-semibold text-brand-blue-700 hover:underline";

/**
 * /admin/visa-cases — 체류 사건(VisaCase) 기본 관리 (R-216). 권한 `visaCase:view`·`visaCase:manage`
 * (행정사·관리자). WO §11 직원 권한 분리: 매칭 담당(STAFF_PLACEMENT)은 체류 사건을 볼 수 없다.
 * BR-13: 외국인등록번호·여권번호 등 고유식별정보 칸 없음(Phase 3).
 */
export default async function VisaCasesPage({ searchParams }: Props) {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  if (!can(actor.role, "visaCase:view")) {
    return (
      <ForbiddenNotice text="체류 사건은 행정사 담당 직원과 관리자만 볼 수 있습니다(직원 권한 분리)." />
    );
  }
  const seekerParam = (await searchParams).seekerId;
  const [cases, visas] = await Promise.all([
    listVisaCases(actor),
    db.visaType.findMany({
      where: { active: true, isStatusCode: true },
      orderBy: { sortOrder: "asc" },
      select: { code: true },
    }),
  ]);
  const visaOptions = visas.map((v) => ({ code: v.code, label: v.code }));

  return (
    <div className="grid gap-10" data-testid="admin-visa-cases">
      <div className="grid gap-2">
        <h1 className="text-h2 text-navy">체류 사건</h1>
        <p className="text-dense text-n700">
          체류자격 변경·연장 등 행정사 업무를 기록합니다. 외국인등록번호·여권번호 같은
          고유식별정보는 이 단계에서 받지 않습니다. 사건은 지우지 않고 &lsquo;종결&rsquo;로
          닫습니다.
        </p>
      </div>

      {can(actor.role, "visaCase:manage") ? (
        <section className="grid gap-4" aria-labelledby="visa-case-new">
          <h2 id="visa-case-new" className="text-h3 text-navy">
            체류 사건 등록
          </h2>
          <VisaCaseCreateForm
            seekerId={typeof seekerParam === "string" ? seekerParam : ""}
            visaOptions={visaOptions}
          />
        </section>
      ) : null}

      <section className="grid gap-4" aria-labelledby="visa-case-list">
        <h2 id="visa-case-list" className="text-h3 text-navy">
          사건 목록
        </h2>
        {cases.length === 0 ? (
          <p className="text-dense text-n500">등록된 체류 사건이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border bg-white shadow-1">
            <table
              className="w-full min-w-200 border-collapse text-dense"
              data-testid="visa-case-table"
            >
              <thead className="bg-n50 text-label text-n700">
                <tr>
                  <th scope="col" className={cell}>
                    사건
                  </th>
                  <th scope="col" className={cell}>
                    구직자
                  </th>
                  <th scope="col" className={cell}>
                    진행 상태
                  </th>
                  <th scope="col" className={cell}>
                    수정
                  </th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id} className="border-t border-n100" data-visa-case-id={c.id}>
                    <td className={cell}>
                      <Link href={`/admin/visa-cases/${c.id}`} className={link}>
                        {VISA_CASE_TYPE_LABEL[c.caseType] ?? c.caseType}
                        {c.targetVisa ? ` → ${c.targetVisa}` : ""}
                      </Link>
                      <span className="block text-caption text-n500">
                        등록 {fmtDate(c.createdAt)}
                      </span>
                    </td>
                    <td className={cell}>
                      구직자 등급 {SEEKER_GRADE_LABEL[c.seeker.grade]} · {c.seeker.visaCode ?? "—"}
                    </td>
                    <td className={cell}>{VISA_CASE_STATUS_LABEL[c.status] ?? c.status}</td>
                    <td className={cell}>{fmtDateTime(c.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
