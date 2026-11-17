import { BadgeCheck, CircleDashed, FileCheck, FileX, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";

import { fmtDate, fmtDateTime, isoDay } from "@/app/admin/_i18n/ko";
import { CompanyContractForm, CompanyVerifyForm } from "@/components/admin/company-forms";
import { ForbiddenNotice } from "@/components/admin/forbidden-notice";
import { Badge } from "@/components/ui/badge";
import { listAdminCompanies } from "@/lib/admin/companies";
import { STAFF_RECORDED_CONTRACT } from "@/lib/employer/contract";
import { requireStaff } from "@/lib/admin/session";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export const metadata: Metadata = { title: "기업 검증" };
export const dynamic = "force-dynamic";

const cell = "px-4 py-3 text-start align-top";

/**
 * /admin/companies — 기업 검증·계약 등록 (R-218, PC-2). 권한 `company:verify`(매칭 담당·관리자, Q-08).
 * 검증 완료와 계약이 모두 있어야 기업이 후보 목록을 봅니다(R-205). 회사 이름은 복호 표시이므로 목록을
 * 볼 때마다 PII_VIEW가 남습니다. 사업자등록번호가 없는 행은 블라인드 공고를 만들 때 수집 리드에서 자동
 * 생성된 회사입니다(Q-17 ①) — 가입 기업과 같은 회사일 수 있어 표시만 하고, 병합은 하지 않습니다.
 */
export default async function CompaniesPage() {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  if (!can(actor.role, "company:verify")) {
    return <ForbiddenNotice text="기업 검증·계약 등록은 매칭 담당 직원과 관리자만 합니다." />;
  }
  const [companies, sidos, industries] = await Promise.all([
    listAdminCompanies(actor.id),
    db.region.findMany({ where: { level: "SIDO" }, select: { code: true, nameKo: true } }),
    db.industry.findMany({ select: { code: true, nameKo: true } }),
  ]);
  const sidoName = new Map(sidos.map((r) => [r.code, r.nameKo]));
  const industryName = new Map(industries.map((i) => [i.code, i.nameKo]));
  const today = isoDay(new Date());

  return (
    <div className="grid gap-8" data-testid="admin-companies">
      <div className="grid gap-2">
        <h1 className="text-h2 text-navy">기업 검증</h1>
        <p className="text-dense text-n700">
          직원이 사업자 정보를 확인하면 &lsquo;검증 완료&rsquo;로 표시하고, 계약을 확인하면 계약일을
          등록합니다. 둘 다 있어야 기업 화면에 블라인드 후보 목록이 보이고, 아니면 요약 통계만
          보입니다. 바꿀 때마다 감사 로그가 남습니다.
        </p>
      </div>

      {companies.length === 0 ? (
        <p className="text-dense text-n500">등록된 기업이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-white shadow-1">
          <table
            className="w-full min-w-240 border-collapse text-dense"
            data-testid="company-table"
          >
            <thead className="bg-n50 text-label text-n700">
              <tr>
                <th scope="col" className={cell}>
                  회사 (직원 전용)
                </th>
                <th scope="col" className={cell}>
                  사업자등록번호
                </th>
                <th scope="col" className={cell}>
                  검증
                </th>
                <th scope="col" className={cell}>
                  계약
                </th>
                <th scope="col" className={cell}>
                  체류 업무 위임 동의
                </th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="border-t border-n100" data-company-id={c.id}>
                  <td className={cell}>
                    <span className="block font-semibold text-navy">
                      {c.name ?? "회사명을 읽을 수 없음(관리자 확인 필요)"}
                    </span>
                    <span className="block text-caption text-n500">
                      {industryName.get(c.industryCode) ?? c.industryCode} ·{" "}
                      {sidoName.get(c.sido) ?? c.sido} · 가입 계정 {c.accounts}개 · 등록{" "}
                      {fmtDate(c.createdAt)}
                    </span>
                  </td>
                  <td className={cell}>
                    {c.hasBizRegNo ? (
                      <Badge variant="neutral">
                        <FileCheck aria-hidden="true" strokeWidth={1.5} />
                        등록됨
                      </Badge>
                    ) : (
                      <Badge variant="orange" data-testid="company-auto-created">
                        <TriangleAlert aria-hidden="true" strokeWidth={1.5} />
                        {c.autoCreated ? "사업자번호 없음(자동 생성)" : "사업자번호 없음"}
                      </Badge>
                    )}
                  </td>
                  <td className={cell}>
                    <div className="grid justify-items-start gap-2">
                      {c.verified ? (
                        <Badge variant="cyan" data-testid="company-verified">
                          <BadgeCheck aria-hidden="true" strokeWidth={1.5} />
                          검증 완료
                        </Badge>
                      ) : (
                        <Badge variant="orange" data-testid="company-unverified">
                          <CircleDashed aria-hidden="true" strokeWidth={1.5} />
                          검증 전
                        </Badge>
                      )}
                      {c.verifiedAt ? (
                        <span className="text-caption text-n700 tabular-nums">
                          {fmtDateTime(c.verifiedAt)}
                        </span>
                      ) : null}
                      <CompanyVerifyForm companyId={c.id} verified={c.verified} />
                    </div>
                  </td>
                  <td className={cell}>
                    <div className="grid justify-items-start gap-2">
                      {c.contractSignedAt ? (
                        <Badge variant="blue" data-testid="company-contracted">
                          <FileCheck aria-hidden="true" strokeWidth={1.5} />
                          계약 {fmtDate(c.contractSignedAt)}
                        </Badge>
                      ) : (
                        <Badge variant="outline" data-testid="company-no-contract">
                          <FileX aria-hidden="true" strokeWidth={1.5} />
                          계약 없음
                        </Badge>
                      )}
                      {c.contractVersion ? (
                        <span className="text-caption text-n700">
                          {c.contractVersion === STAFF_RECORDED_CONTRACT
                            ? "직원 등록"
                            : `약관 ${c.contractVersion} 동의`}
                        </span>
                      ) : null}
                      <CompanyContractForm
                        companyId={c.id}
                        signedOn={c.contractSignedAt ? isoDay(c.contractSignedAt) : ""}
                        today={today}
                      />
                    </div>
                  </td>
                  <td className={cell}>{c.visaMandateAgreed ? "동의" : "미동의(선택)"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
