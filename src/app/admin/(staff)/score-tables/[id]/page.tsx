import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { fmtDateTime } from "@/app/admin/_i18n/ko";
import { ForbiddenNotice } from "@/components/admin/forbidden-notice";
import { RuleStatusBadge, SampleBadge } from "@/components/admin/rule-badges";
import {
  NewVersionButton,
  PublishButton,
  RetireButton,
  ScoreTableForm,
} from "@/components/admin/rule-forms";
import { requireStaff } from "@/lib/admin/session";
import { can } from "@/lib/rbac";
import { getScoreTable, hasSampleMarker, reviewerNames } from "@/lib/rules/manage";

export const metadata: Metadata = { title: "점수표 상세" };
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
 * /admin/score-tables/[id] — 점수표 버전 상세 (R-215). 초안: 고치기·게시(검수자·시각 기록, 같은 이름의 이전
 * 게시 버전 폐기). 게시 중: 폐기·새 버전. 게시·폐기는 확인 다이얼로그와 감사 로그(RULE_PUBLISH).
 */
export default async function ScoreTablePage({ params }: Props) {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  if (!can(actor.role, "rules:edit")) {
    return <ForbiddenNotice text="점수표는 비자 담당 직원과 관리자만 관리합니다." />;
  }
  const { id } = await params;
  const found = await getScoreTable(id);
  if (!found) notFound();
  const { table, versions } = found;
  const reviewers = await reviewerNames(versions.map((v) => v.reviewedBy));
  const canPublish = can(actor.role, "rules:publish");
  const sample = table.isSample || hasSampleMarker(table.items);
  const summary = `${table.name} v${table.version}.`;
  const hasDraft = versions.some((v) => v.status === "DRAFT");

  return (
    <div className="grid gap-8" data-testid="admin-score-table" data-status={table.status}>
      <div className="grid gap-2">
        <Link href="/admin/score-tables" className={link}>
          점수표로
        </Link>
        <h1 className="flex flex-wrap items-center gap-3 text-h2 text-navy">
          {table.name} 점수표 v{table.version}
          <RuleStatusBadge status={table.status} />
          {sample ? <SampleBadge /> : null}
        </h1>
      </div>

      <section className="grid gap-4 rounded-md border border-border bg-white p-6 shadow-1">
        <dl className="divide-y divide-n100">
          <Field
            label="합격 점수"
            value={table.passScore === null ? "없음" : String(table.passScore)}
          />
          <Field
            label="검수(게시)"
            value={
              table.reviewedAt
                ? `${reviewers.get(table.reviewedBy ?? "") ?? "직원"} · ${fmtDateTime(table.reviewedAt)}`
                : "게시 전"
            }
          />
          <Field
            label="항목·구간·배점 (JSON)"
            value={
              <pre className="overflow-x-auto rounded-sm bg-n50 p-3 font-mono text-caption whitespace-pre-wrap">
                {JSON.stringify(table.items, null, 2)}
              </pre>
            }
          />
        </dl>
        <div className="flex flex-wrap items-start gap-3">
          {table.status === "DRAFT" && canPublish ? (
            <PublishButton kind="table" id={table.id} summary={summary} />
          ) : null}
          {table.status === "PUBLISHED" && canPublish ? (
            <RetireButton kind="table" id={table.id} summary={summary} />
          ) : null}
          {table.status !== "DRAFT" && !hasDraft ? (
            <NewVersionButton kind="table" id={table.id} />
          ) : null}
        </div>
        {sample && table.status === "DRAFT" ? (
          <p className="text-caption text-n500">
            샘플 점수표는 구조만 보여 주는 예시입니다(배점 0). 행정사가 실제 항목·배점을 입력하고
            &quot;__sample&quot; 표시를 지운 뒤 저장해야 게시할 수 있습니다.
          </p>
        ) : null}
      </section>

      {table.status === "DRAFT" ? (
        <section
          aria-labelledby="edit-table-title"
          className="grid gap-4 rounded-md border border-border bg-white p-6 shadow-1"
        >
          <h2 id="edit-table-title" className="text-h3 text-navy">
            초안 고치기
          </h2>
          <ScoreTableForm
            id={table.id}
            values={{
              name: table.name,
              passScore: table.passScore === null ? "" : String(table.passScore),
              items: JSON.stringify(table.items, null, 2),
            }}
          />
        </section>
      ) : null}

      <section aria-labelledby="table-versions-title" className="grid gap-4">
        <h2 id="table-versions-title" className="text-h3 text-navy">
          버전 기록
        </h2>
        <div className="overflow-x-auto rounded-md border border-border bg-white shadow-1">
          <table
            className="w-full min-w-180 border-collapse text-dense"
            data-testid="table-versions"
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
                  검수(게시)
                </th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id} className="border-t border-n100" data-version={v.version}>
                  <td className={cell}>
                    {v.id === table.id ? (
                      `v${v.version} (이 화면)`
                    ) : (
                      <Link href={`/admin/score-tables/${v.id}`} className={link}>
                        v{v.version}
                      </Link>
                    )}
                  </td>
                  <td className={cell}>
                    <RuleStatusBadge status={v.status} />
                  </td>
                  <td className={cell}>
                    {v.reviewedAt
                      ? `${reviewers.get(v.reviewedBy ?? "") ?? "직원"} · ${fmtDateTime(v.reviewedAt)}`
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
