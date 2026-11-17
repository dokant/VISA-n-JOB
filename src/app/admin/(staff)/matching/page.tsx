import { CircleCheck, CircleDashed } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  INTEREST_INITIATOR_LABEL,
  INTERVIEW_STATUS_LABEL,
  SEEKER_GRADE_LABEL,
  fmtCount,
  fmtDate,
  fmtDateTime,
} from "@/app/admin/_i18n/ko";
import { ForbiddenNotice } from "@/components/admin/forbidden-notice";
import { RecommendButton } from "@/components/admin/matching-forms";
import { Badge } from "@/components/ui/badge";
import { ADMIN_LIST_MAX } from "@/config/limits";
import { requireStaff } from "@/lib/admin/session";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { findRecommendations } from "@/lib/recommendations/ledger";
import { listMatchPostings, listOpenInterestRequests } from "@/lib/recommendations/matching";

export const metadata: Metadata = { title: "매칭" };
export const dynamic = "force-dynamic";

const cell = "px-4 py-3 text-start align-top";
const link =
  "inline-flex min-h-11 min-w-11 items-center font-semibold text-brand-blue-700 hover:underline";

/**
 * /admin/matching — 매칭 (R-209, WO §6.5): 공고별 적합 구직자로 가기, 접수된 면접 신청·요청에 대한 추천 실행
 * (최신순, ADMIN_LIST_MAX건씩 `?page=` — P2c QA O-4), 최근 추천(원장)과 면접 일정.
 * 권한 `recommendation:create`(매칭 담당·관리자). 복호 필드는 읽지 않는다.
 */
export default async function MatchingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  if (!can(actor.role, "recommendation:create")) {
    return <ForbiddenNotice text="매칭과 추천 실행은 매칭 담당 직원과 관리자만 합니다." />;
  }
  const { page: rawPage } = await searchParams;
  const [postings, open, recent, sidos, industries] = await Promise.all([
    listMatchPostings(),
    listOpenInterestRequests({ page: Number.parseInt(rawPage ?? "1", 10) }),
    findRecommendations({
      where: {},
      take: ADMIN_LIST_MAX,
      select: {
        id: true,
        recommendedAt: true,
        seekerId: true,
        seeker: { select: { grade: true, visaCode: true } },
        company: { select: { industryCode: true, sido: true } },
        posting: { select: { blindTitle: true } },
        interviews: {
          orderBy: { scheduledAt: "asc" },
          select: { scheduledAt: true, status: true },
        },
      },
    }),
    db.region.findMany({ where: { level: "SIDO" }, select: { code: true, nameKo: true } }),
    db.industry.findMany({ select: { code: true, nameKo: true } }),
  ]);
  const sidoName = new Map(sidos.map((r) => [r.code, r.nameKo]));
  const industryName = new Map(industries.map((i) => [i.code, i.nameKo]));
  const interests = open.rows;
  const first = (open.page - 1) * open.take + 1;
  const last = first + interests.length - 1;
  const pageHref = (n: number) => (n <= 1 ? "/admin/matching" : `/admin/matching?page=${n}`);
  const where = (industry: string, sido: string) =>
    `${industryName.get(industry) ?? industry} · ${sidoName.get(sido) ?? sido}`;

  return (
    <div className="grid gap-10" data-testid="admin-matching">
      <div className="grid gap-2">
        <h1 className="text-h2 text-navy">매칭</h1>
        <p className="text-dense text-n700">
          공고별 적합 구직자를 보고 추천을 실행합니다. 추천은 고치거나 지울 수 없는 원장에 기록되고
          감사 로그가 남습니다. 기업 화면에는 블라인드 정보만 보이고, 실명은 면접이 확정된 뒤
          구직자가 그 면접 건에 동의했을 때만 그 기업에 보입니다. 연락처는 어디에도 보이지 않습니다.
        </p>
      </div>

      <section className="grid gap-3" aria-labelledby="matching-postings">
        <h2 id="matching-postings" className="text-h3 text-navy">
          공개 중인 블라인드 공고 ({fmtCount(postings.length, "건")})
        </h2>
        {postings.length === 0 ? (
          <p className="text-dense text-n500">공개·검증된 공고가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border bg-white shadow-1">
            <table className="w-full min-w-200 border-collapse text-dense">
              <thead className="bg-n50 text-label text-n700">
                <tr>
                  <th scope="col" className={cell}>
                    공고
                  </th>
                  <th scope="col" className={cell}>
                    업종 · 지역
                  </th>
                  <th scope="col" className={cell}>
                    채용 가능 비자
                  </th>
                  <th scope="col" className={cell}>
                    추천
                  </th>
                </tr>
              </thead>
              <tbody>
                {postings.map((p) => (
                  <tr key={p.id} className="border-t border-n100" data-posting-id={p.id}>
                    <td className={cell}>
                      <Link href={`/admin/matching/${p.id}`} className={link}>
                        {p.blindTitle}
                      </Link>
                      <span className="block text-caption text-n500">
                        {p.role} · 공개 {fmtDate(p.publishedAt)}
                      </span>
                    </td>
                    <td className={cell}>{where(p.industryCode, p.sido)}</td>
                    <td className={cell}>{p.eligibleVisas.join(", ")}</td>
                    <td className={cell}>{fmtCount(p._count.recommendations, "건")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-3" aria-labelledby="matching-interests">
        <h2 id="matching-interests" className="text-h3 text-navy">
          추천 전 면접 신청·요청 ({fmtCount(open.total, "건")})
        </h2>
        {open.total > 0 ? (
          <p className="text-dense text-n700" data-testid="matching-interests-range">
            최신순 · 전체 {fmtCount(open.total, "건")} 중 {fmtCount(first)}–{fmtCount(last, "건")}{" "}
            표시
          </p>
        ) : null}
        {interests.length === 0 ? (
          <p className="text-dense text-n500">추천을 기다리는 면접 신청·요청이 없습니다.</p>
        ) : (
          <ul className="grid gap-3" data-testid="matching-interests">
            {interests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border bg-white p-4 shadow-1"
                data-interest-id={r.id}
              >
                <div className="grid gap-1 text-dense">
                  <p className="font-semibold text-navy">
                    {INTEREST_INITIATOR_LABEL[r.initiator] ?? r.initiator} ·{" "}
                    {fmtDateTime(r.createdAt)}
                  </p>
                  <p className="text-n700">
                    구직자{" "}
                    <Link href={`/admin/seekers/${r.seekerId}`} className={link}>
                      검토 화면
                    </Link>{" "}
                    · 구직자 등급 {SEEKER_GRADE_LABEL[r.seeker.grade]} · {r.seeker.visaCode ?? "—"}
                    {r.posting ? ` · 공고 ${r.posting.blindTitle}` : ""}
                  </p>
                  {r.eligible ? (
                    <Badge variant="cyan">
                      <CircleCheck aria-hidden="true" strokeWidth={1.5} />
                      추천 가능
                    </Badge>
                  ) : (
                    <Badge variant="orange">
                      <CircleDashed aria-hidden="true" strokeWidth={1.5} />
                      추천 조건 미충족(구직자 등급·트랙·상태·동의 확인)
                    </Badge>
                  )}
                </div>
                {r.eligible && r.targetCompanyId ? (
                  <RecommendButton
                    target={{ interestRequestId: r.id }}
                    summary="이 면접 신청·요청의 기업에 이 구직자를 추천합니다."
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {open.pageCount > 1 ? (
          <nav
            aria-label="면접 신청·요청 페이지"
            className="flex flex-wrap items-center gap-4"
            data-testid="matching-interests-pager"
          >
            {open.page > 1 ? (
              <Link href={pageHref(open.page - 1)} className={link} rel="prev">
                이전 {fmtCount(open.take, "건")}
              </Link>
            ) : null}
            <span className="text-dense text-n700">
              페이지 {fmtCount(open.page)} / {fmtCount(open.pageCount)}
            </span>
            {open.page < open.pageCount ? (
              <Link
                href={pageHref(open.page + 1)}
                className={link}
                rel="next"
                data-testid="matching-interests-next"
              >
                다음 {fmtCount(open.take, "건")}
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>

      <section className="grid gap-3" aria-labelledby="matching-recent">
        <h2 id="matching-recent" className="text-h3 text-navy">
          최근 추천 원장
        </h2>
        {recent.length === 0 ? (
          <p className="text-dense text-n500">추천 기록이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border bg-white shadow-1">
            <table
              className="w-full min-w-200 border-collapse text-dense"
              data-testid="matching-recent"
            >
              <thead className="bg-n50 text-label text-n700">
                <tr>
                  <th scope="col" className={cell}>
                    추천 시각
                  </th>
                  <th scope="col" className={cell}>
                    구직자
                  </th>
                  <th scope="col" className={cell}>
                    기업 · 공고
                  </th>
                  <th scope="col" className={cell}>
                    면접
                  </th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-t border-n100" data-recommendation-id={r.id}>
                    <td className={cell}>
                      <Link href={`/admin/matching/recommendations/${r.id}`} className={link}>
                        {fmtDateTime(r.recommendedAt)}
                      </Link>
                    </td>
                    <td className={cell}>
                      구직자 등급 {SEEKER_GRADE_LABEL[r.seeker.grade]} · {r.seeker.visaCode ?? "—"}
                    </td>
                    <td className={cell}>
                      {where(r.company.industryCode, r.company.sido)}
                      {r.posting ? (
                        <span className="block text-caption text-n500">{r.posting.blindTitle}</span>
                      ) : null}
                    </td>
                    <td className={cell}>
                      {r.interviews.length === 0
                        ? "일정 없음"
                        : r.interviews
                            .map(
                              (i) =>
                                `${fmtDateTime(i.scheduledAt)} ${INTERVIEW_STATUS_LABEL[i.status] ?? i.status}`,
                            )
                            .join(" / ")}
                    </td>
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
