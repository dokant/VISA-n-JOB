import { CircleCheck, CircleMinus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JOB_SEARCH_LABEL, SEEKER_GRADE_LABEL, fmtCount } from "@/app/admin/_i18n/ko";
import { ForbiddenNotice } from "@/components/admin/forbidden-notice";
import { RecommendButton } from "@/components/admin/matching-forms";
import { Badge } from "@/components/ui/badge";
import { requireStaff } from "@/lib/admin/session";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { ANY_REGION } from "@/lib/seeker/options";
import { type MatchScope, getMatchPosting, matchCandidates } from "@/lib/recommendations/matching";

export const metadata: Metadata = { title: "공고별 적합 구직자" };
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ postingId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const cell = "px-4 py-3 text-start align-top";
const link =
  "inline-flex min-h-11 min-w-11 items-center font-semibold text-brand-blue-700 hover:underline";

function MatchBadge({ ok, label }: { ok: boolean; label: string }) {
  return ok ? (
    <Badge variant="cyan">
      <CircleCheck aria-hidden="true" strokeWidth={1.5} />
      {label} 일치
    </Badge>
  ) : (
    <Badge variant="outline">
      <CircleMinus aria-hidden="true" strokeWidth={1.5} />
      {label} 다름
    </Badge>
  );
}

/**
 * /admin/matching/[postingId] — 공고별 적합 구직자 (R-209). eligibleCandidateWhere(BR-06·07, BLIND_PROFILE)
 * + 공고 조건(비자 eligibleVisas 항상, 지역·업종은 "조건 일치"에서만). "비자만 맞춤"은 직원이 직접 판단하는
 * 넓은 목록. 추천 실행은 서버에서 같은 조건을 다시 확인하고 원장에 기록한다.
 */
export default async function MatchingPostingPage({ params, searchParams }: Props) {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  if (!can(actor.role, "recommendation:create")) {
    return <ForbiddenNotice text="매칭과 추천 실행은 매칭 담당 직원과 관리자만 합니다." />;
  }
  const { postingId } = await params;
  const scope: MatchScope = (await searchParams).scope === "visa" ? "visa" : "strict";
  const posting = await getMatchPosting(postingId);
  if (!posting) notFound();
  const [candidates, sidos, industries] = await Promise.all([
    matchCandidates(posting, scope),
    db.region.findMany({ where: { level: "SIDO" }, select: { code: true, nameKo: true } }),
    db.industry.findMany({ select: { code: true, nameKo: true } }),
  ]);
  const sidoName = new Map(sidos.map((r) => [r.code, r.nameKo]));
  const industryName = new Map(industries.map((i) => [i.code, i.nameKo]));
  const names = (codes: string[], map: Map<string, string>) =>
    codes.length === 0 ? "상관없음" : codes.map((c) => map.get(c) ?? c).join(", ");

  return (
    <div className="grid gap-8" data-testid="admin-matching-posting">
      <div className="grid gap-2">
        <Link href="/admin/matching" className={link}>
          매칭으로
        </Link>
        <h1 className="text-h2 text-navy">{posting.blindTitle}</h1>
        <p className="text-dense text-n700">
          {posting.role} · {industryName.get(posting.industryCode) ?? posting.industryCode} ·{" "}
          {sidoName.get(posting.sido) ?? posting.sido} · 채용 가능 비자{" "}
          {posting.eligibleVisas.join(", ")} · 채용 인원 {fmtCount(posting.headcount, "명")}
        </p>
      </div>

      <nav aria-label="목록 범위" className="flex flex-wrap gap-2">
        <Link
          href={`/admin/matching/${posting.id}`}
          aria-current={scope === "strict" ? "page" : undefined}
          className="inline-flex h-11 items-center rounded-full border border-n200 px-4 text-dense font-semibold text-navy aria-[current=page]:bg-n100"
        >
          조건 일치(비자·지역·업종)
        </Link>
        <Link
          href={`/admin/matching/${posting.id}?scope=visa`}
          aria-current={scope === "visa" ? "page" : undefined}
          className="inline-flex h-11 items-center rounded-full border border-n200 px-4 text-dense font-semibold text-navy aria-[current=page]:bg-n100"
        >
          비자만 맞춤(넓게 보기)
        </Link>
      </nav>

      <p className="text-dense text-n700" data-testid="match-count">
        적합 구직자 {fmtCount(candidates.length, "명")}
      </p>
      {candidates.length === 0 ? (
        <p className="text-dense text-n500">조건에 맞는 구직자가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-white shadow-1">
          <table
            className="w-full min-w-240 border-collapse text-dense"
            data-testid="match-candidates"
          >
            <thead className="bg-n50 text-label text-n700">
              <tr>
                <th scope="col" className={cell}>
                  구직자
                </th>
                <th scope="col" className={cell}>
                  비자 · 거주
                </th>
                <th scope="col" className={cell}>
                  희망 지역 · 업종
                </th>
                <th scope="col" className={cell}>
                  일치
                </th>
                <th scope="col" className={cell}>
                  추천
                </th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.id} className="border-t border-n100" data-seeker-id={c.id}>
                  <td className={cell}>
                    <Link href={`/admin/seekers/${c.id}`} className={link}>
                      구직자 등급 {SEEKER_GRADE_LABEL[c.grade]}
                    </Link>
                    <span className="block text-caption text-n500">
                      {c.jobSearchStatus ? JOB_SEARCH_LABEL[c.jobSearchStatus] : "—"}
                      {c.verifiedKorean ? " · 한국어 확인" : ""}
                    </span>
                  </td>
                  <td className={cell}>
                    {c.visaCode ?? "—"}
                    {c.visaSubType ? ` (${c.visaSubType})` : ""} ·{" "}
                    {c.sido ? (sidoName.get(c.sido) ?? c.sido) : "—"}
                  </td>
                  <td className={cell}>
                    {c.desiredRegions.includes(ANY_REGION)
                      ? "어디든 가능"
                      : names(c.desiredRegions, sidoName)}
                    <span className="block text-caption text-n500">
                      {names(c.desiredIndustries, industryName)}
                    </span>
                  </td>
                  <td className={cell}>
                    <div className="flex flex-wrap gap-1.5">
                      <MatchBadge ok={c.regionMatch} label="지역" />
                      <MatchBadge ok={c.industryMatch} label="업종" />
                    </div>
                  </td>
                  <td className={cell}>
                    {c.recommendationId ? (
                      <Link
                        href={`/admin/matching/recommendations/${c.recommendationId}`}
                        className={link}
                        data-testid="already-recommended"
                      >
                        추천함 · 면접 관리
                      </Link>
                    ) : (
                      <RecommendButton
                        target={{ postingId: posting.id, seekerId: c.id }}
                        summary={`"${posting.blindTitle}" 공고의 기업에 이 구직자를 추천합니다.`}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
