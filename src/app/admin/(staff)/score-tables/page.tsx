import type { Metadata } from "next";
import Link from "next/link";

import { fmtDateTime, staffName } from "@/app/admin/_i18n/ko";
import { ForbiddenNotice } from "@/components/admin/forbidden-notice";
import { RuleStatusBadge, SampleBadge } from "@/components/admin/rule-badges";
import { ScoreTableForm } from "@/components/admin/rule-forms";
import { requireStaff } from "@/lib/admin/session";
import { can } from "@/lib/rbac";
import { listScoreTables, reviewerNames } from "@/lib/rules/manage";
import { E74_SLUG, normalizeTableName } from "@/lib/score/e74";

export const metadata: Metadata = { title: "점수표" };
export const dynamic = "force-dynamic";

const cell = "px-4 py-3 text-start align-top";
const link =
  "inline-flex min-h-11 min-w-11 items-center font-semibold text-brand-blue-700 hover:underline";

/** Starting JSON of a new table: structure only, no item and no point value (BR-12). */
const EMPTY_ITEMS = JSON.stringify({ items: [] }, null, 2);

/**
 * /admin/score-tables — 점수표 (R-215, WO §10). 공개 점수 계산기(/score/e74)는 이름이 E-7-4인 게시
 * (PUBLISHED) 점수표만 쓰고, 없으면 "준비 중"을 보여 준다. 항목·구간·배점·합격 점수는 행정사가 입력한다.
 */
export default async function ScoreTablesPage() {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  if (!can(actor.role, "rules:edit")) {
    return <ForbiddenNotice text="점수표는 비자 담당 직원과 관리자만 관리합니다." />;
  }
  const tables = await listScoreTables();
  const reviewers = await reviewerNames(tables.map((t) => t.reviewedBy));
  // Default name of a new table: the calculator's table name as stored (no visa code literal, BR-12).
  const calculatorName = tables.find((t) => normalizeTableName(t.name) === E74_SLUG)?.name ?? "";

  return (
    <div className="grid gap-8" data-testid="admin-score-tables">
      <div className="grid gap-2">
        <h1 className="text-h2 text-navy">점수표</h1>
        <p className="text-dense text-n700">
          점수 계산기는 &lsquo;게시 중&rsquo;인 점수표만 씁니다. 초안과 폐기된 버전은 계산에 쓰이지
          않습니다. 항목·구간·배점과 합격 점수는 행정사가 입력하고, 게시하면 검수자와 게시 시각이
          기록됩니다. 같은 이름의 새 버전을 게시하면 이전 게시 버전은 폐기됩니다.
        </p>
      </div>

      {tables.length === 0 ? (
        <p className="text-dense text-n500">등록된 점수표가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-white shadow-1">
          <table
            className="w-full min-w-180 border-collapse text-dense"
            data-testid="score-table-list"
          >
            <thead className="bg-n50 text-label text-n700">
              <tr>
                <th scope="col" className={cell}>
                  이름
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
              {tables.map((t) => (
                <tr key={t.id} className="border-t border-n100" data-table-id={t.id}>
                  <td className={cell}>
                    {t.name}
                    {t.isSample ? (
                      <span className="mt-1 block">
                        <SampleBadge />
                      </span>
                    ) : null}
                  </td>
                  <td className={cell}>
                    <span className="flex flex-wrap items-center gap-2">
                      v{t.version}
                      <RuleStatusBadge status={t.status} />
                    </span>
                  </td>
                  <td className={cell}>
                    {t.reviewedAt
                      ? `${staffName(reviewers.get(t.reviewedBy ?? ""))} · ${fmtDateTime(t.reviewedAt)}`
                      : "—"}
                  </td>
                  <td className={cell}>
                    <Link href={`/admin/score-tables/${t.id}`} className={link}>
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
        aria-labelledby="new-table-title"
        className="grid gap-4 rounded-md border border-border bg-white p-6 shadow-1"
      >
        <h2 id="new-table-title" className="text-h3 text-navy">
          새 점수표 초안
        </h2>
        <p className="text-dense text-n700">
          이미 있는 이름이면 그 점수표의 다음 버전 초안이 됩니다. 기존 버전의 내용을 이어서 고치려면
          상세 화면의 &lsquo;새 버전 만들기&rsquo;를 쓰세요.
        </p>
        <ScoreTableForm values={{ name: calculatorName, passScore: "", items: EMPTY_ITEMS }} />
      </section>
    </div>
  );
}
