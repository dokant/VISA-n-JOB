import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { OUTCOME_LABEL, fmtDateTime, staffName, visaOptions } from "@/app/admin/_i18n/ko";
import { ForbiddenNotice } from "@/components/admin/forbidden-notice";
import { RuleStatusBadge, SampleBadge } from "@/components/admin/rule-badges";
import {
  NewVersionButton,
  PublishButton,
  RetireButton,
  VisaRuleForm,
} from "@/components/admin/rule-forms";
import { requireStaff } from "@/lib/admin/session";
import { can } from "@/lib/rbac";
import { getVisaRule, hasSampleMarker, reviewerNames } from "@/lib/rules/manage";
import { ruleOptions } from "@/lib/rules/options";

export const metadata: Metadata = { title: "규칙 상세" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

const cell = "px-4 py-3 text-start align-top";
const link =
  "inline-flex min-h-11 min-w-11 items-center font-semibold text-brand-blue-700 hover:underline";

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-3 sm:gap-4">
      <dt className="text-label text-n500">{label}</dt>
      <dd className="text-dense text-navy sm:col-span-2">{value}</dd>
    </div>
  );
}

/**
 * /admin/rules/[id] — 규칙 버전 상세 (R-215). 초안: 고치기·게시(검수자·시각 기록, 이전 게시 버전 폐기).
 * 게시 중: 폐기·새 버전. 폐기: 새 버전. 게시·폐기는 확인 다이얼로그를 거치고 감사 로그(RULE_PUBLISH)가 남는다.
 */
export default async function RulePage({ params }: Props) {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  if (!can(actor.role, "rules:edit")) {
    return <ForbiddenNotice text="규칙 DB는 비자 담당 직원과 관리자만 관리합니다." />;
  }
  const { id } = await params;
  const found = await getVisaRule(id);
  if (!found) notFound();
  const { rule, versions } = found;
  const [options, reviewers] = await Promise.all([
    ruleOptions(),
    reviewerNames(versions.map((v) => v.reviewedBy)),
  ]);
  const canPublish = can(actor.role, "rules:publish");
  const sample = rule.isSample || hasSampleMarker(rule.conditions);
  const summary = `${rule.visaCode} · ${rule.industryCode ? options.industryName(rule.industryCode) : "모든 업종"} · ${OUTCOME_LABEL[rule.outcome]} · v${rule.version}.`;
  const hasDraft = versions.some((v) => v.status === "DRAFT");

  return (
    <div className="grid gap-8" data-testid="admin-rule" data-status={rule.status}>
      <div className="grid gap-2">
        <Link href="/admin/rules" className={link}>
          규칙 DB로
        </Link>
        <h1 className="flex flex-wrap items-center gap-3 text-h2 text-navy">
          {rule.visaCode} 규칙 v{rule.version}
          <RuleStatusBadge status={rule.status} />
          {sample ? <SampleBadge /> : null}
        </h1>
      </div>

      <section className="grid gap-4 rounded-md border border-border bg-white p-6 shadow-1">
        <dl className="divide-y divide-n100">
          <Field
            label="비자 · 업종"
            value={`${rule.visaCode} · ${rule.industryCode ? options.industryName(rule.industryCode) : "모든 업종"}`}
          />
          <Field label="판정" value={OUTCOME_LABEL[rule.outcome]} />
          <Field label="안내 문구" value={options.messageText(rule.messageKey)} />
          <Field
            label="검수(게시)"
            value={
              rule.reviewedAt
                ? `${staffName(reviewers.get(rule.reviewedBy ?? ""))} · ${fmtDateTime(rule.reviewedAt)}`
                : "게시 전"
            }
          />
          <Field
            label="조건 (JSON)"
            value={
              <pre className="overflow-x-auto rounded-sm bg-n50 p-3 font-mono text-caption whitespace-pre-wrap">
                {JSON.stringify(rule.conditions, null, 2)}
              </pre>
            }
          />
        </dl>
        <div className="flex flex-wrap items-start gap-3">
          {rule.status === "DRAFT" && canPublish && !sample ? (
            <PublishButton kind="rule" id={rule.id} summary={summary} />
          ) : null}
          {rule.status === "PUBLISHED" && canPublish ? (
            <RetireButton kind="rule" id={rule.id} summary={summary} />
          ) : null}
          {rule.status !== "DRAFT" && !hasDraft ? (
            <NewVersionButton kind="rule" id={rule.id} />
          ) : null}
        </div>
        {sample && rule.status === "DRAFT" ? (
          <p className="text-caption text-n500">
            샘플 규칙은 구조만 보여 주는 예시입니다. 행정사가 실제 조건을 입력하고
            &quot;__sample&quot; 표시를 지운 뒤 저장해야 게시할 수 있습니다.
          </p>
        ) : null}
      </section>

      {rule.status === "DRAFT" ? (
        <section
          aria-labelledby="edit-rule-title"
          className="grid gap-4 rounded-md border border-border bg-white p-6 shadow-1"
        >
          <h2 id="edit-rule-title" className="text-h3 text-navy">
            초안 고치기
          </h2>
          <VisaRuleForm
            id={rule.id}
            values={{
              visaCode: rule.visaCode,
              industryCode: rule.industryCode ?? "",
              outcome: rule.outcome,
              messageKey: rule.messageKey,
              conditions: JSON.stringify(rule.conditions, null, 2),
            }}
            visas={visaOptions(options.visaTypes)}
            industries={options.industries}
            messages={options.messages}
          />
        </section>
      ) : null}

      <section aria-labelledby="versions-title" className="grid gap-4">
        <h2 id="versions-title" className="text-h3 text-navy">
          버전 기록
        </h2>
        <div className="overflow-x-auto rounded-md border border-border bg-white shadow-1">
          <table
            className="w-full min-w-180 border-collapse text-dense"
            data-testid="rule-versions"
          >
            <thead className="bg-n50 text-label text-n700">
              <tr>
                <th scope="col" className={cell}>
                  버전
                </th>
                <th scope="col" className={cell}>
                  상태
                </th>
                <th scope="col" className={cell}>
                  판정
                </th>
                <th scope="col" className={cell}>
                  검수(게시)
                </th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id} className="border-t border-n100" data-version={v.version}>
                  <td className={cell}>
                    {v.id === rule.id ? (
                      `v${v.version} (이 화면)`
                    ) : (
                      <Link href={`/admin/rules/${v.id}`} className={link}>
                        v{v.version}
                      </Link>
                    )}
                  </td>
                  <td className={cell}>
                    <RuleStatusBadge status={v.status} />
                  </td>
                  <td className={cell}>{OUTCOME_LABEL[v.outcome]}</td>
                  <td className={cell}>
                    {v.reviewedAt
                      ? `${staffName(reviewers.get(v.reviewedBy ?? ""))} · ${fmtDateTime(v.reviewedAt)}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
