import type { Metadata } from "next";
import Link from "next/link";

import { OUTCOME_LABEL, fmtDateTime, staffName, visaOptions } from "@/app/admin/_i18n/ko";
import { ForbiddenNotice } from "@/components/admin/forbidden-notice";
import { RuleStatusBadge, SampleBadge } from "@/components/admin/rule-badges";
import { VisaRuleForm } from "@/components/admin/rule-forms";
import { requireStaff } from "@/lib/admin/session";
import { can } from "@/lib/rbac";
import { listVisaRules, reviewerNames } from "@/lib/rules/manage";
import { ruleOptions } from "@/lib/rules/options";

export const metadata: Metadata = { title: "규칙 DB" };
export const dynamic = "force-dynamic";

const cell = "px-4 py-3 text-start align-top";
const link =
  "inline-flex min-h-11 min-w-11 items-center font-semibold text-brand-blue-700 hover:underline";

/**
 * /admin/rules — 규칙 DB (R-215, WO §6.5·§10). 권한 `rules:edit`·`rules:publish`(비자 담당·관리자 =
 * "STAFF_VISA 이상"). 공개 진단(/visa-check, 기업 무료 채용 진단)은 게시(PUBLISHED)된 버전만 쓴다.
 * 값(조건·판정)은 행정사가 입력한다 — 시드의 샘플 규칙은 실제 기준이 아니며 게시할 수 없다(BR-12).
 */
export default async function RulesPage() {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  if (!can(actor.role, "rules:edit")) {
    return <ForbiddenNotice text="규칙 DB는 비자 담당 직원과 관리자만 관리합니다." />;
  }
  const [rules, options] = await Promise.all([listVisaRules(), ruleOptions()]);
  const reviewers = await reviewerNames(rules.map((r) => r.reviewedBy));

  return (
    <div className="grid gap-8" data-testid="admin-rules">
      <div className="grid gap-2">
        <h1 className="text-h2 text-navy">규칙 DB</h1>
        <p className="text-dense text-n700">
          비자 진단과 기업 무료 채용 진단은 &lsquo;게시 중&rsquo;인 규칙만 씁니다. 초안과 폐기된
          버전은 공개 계산에 쓰이지 않습니다. 조건과 판정은 행정사가 입력하고, 게시하면 검수자와
          게시 시각이 기록됩니다. 같은 규칙의 새 버전을 게시하면 이전 게시 버전은 폐기됩니다.
        </p>
      </div>

      {rules.length === 0 ? (
        <p className="text-dense text-n500">등록된 규칙이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-white shadow-1">
          <table className="w-full min-w-240 border-collapse text-dense" data-testid="rule-table">
            <thead className="bg-n50 text-label text-n700">
              <tr>
                <th scope="col" className={cell}>
                  비자 · 업종
                </th>
                <th scope="col" className={cell}>
                  판정
                </th>
                <th scope="col" className={cell}>
                  버전 · 상태
                </th>
                <th scope="col" className={cell}>
                  검수(게시)
                </th>
                <th scope="col" className={cell}>
                  보기
                </th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-t border-n100" data-rule-id={r.id}>
                  <td className={cell}>
                    {r.visaCode} ·{" "}
                    {r.industryCode ? options.industryName(r.industryCode) : "모든 업종"}
                    {r.isSample ? (
                      <span className="mt-1 block">
                        <SampleBadge />
                      </span>
                    ) : null}
                  </td>
                  <td className={cell}>
                    {OUTCOME_LABEL[r.outcome]}
                    <span className="block text-caption text-n500">
                      {options.messageText(r.messageKey)}
                    </span>
                  </td>
                  <td className={cell}>
                    <span className="flex flex-wrap items-center gap-2">
                      v{r.version}
                      <RuleStatusBadge status={r.status} />
                    </span>
                  </td>
                  <td className={cell}>
                    {r.reviewedAt
                      ? `${staffName(reviewers.get(r.reviewedBy ?? ""))} · ${fmtDateTime(r.reviewedAt)}`
                      : "—"}
                  </td>
                  <td className={cell}>
                    <Link href={`/admin/rules/${r.id}`} className={link}>
                      상세
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section
        aria-labelledby="new-rule-title"
        className="grid gap-4 rounded-md border border-border bg-white p-6 shadow-1"
      >
        <h2 id="new-rule-title" className="text-h3 text-navy">
          새 규칙 초안
        </h2>
        <p className="text-dense text-n700">
          초안은 저장해도 공개 진단에 쓰이지 않습니다. 내용을 확인한 뒤 상세 화면에서 게시합니다.
        </p>
        <VisaRuleForm
          values={{
            visaCode: "",
            industryCode: "",
            outcome: "YELLOW",
            messageKey: options.messages[0]?.value ?? "",
            conditions: "{}",
          }}
          visas={visaOptions(options.visaTypes)}
          industries={options.industries}
          messages={options.messages}
        />
      </section>
    </div>
  );
}
