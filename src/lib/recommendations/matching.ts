/**
 * 매칭: 공고별 적합 구직자와 추천 실행 (PRD R-209; WO §6.5 매칭; BR-06, BR-07, BR-09, BR-15).
 *
 * 적합 구직자 = 기업에 보여도 되는 구직자(`eligibleCandidateWhere`: S·A, JOB_MATCH, ACTIVE, 구직 활성,
 * 등록 완료, 체류 만료 전, BLIND_PROFILE 동의 유지 — 쿼리 계층) AND 공고 조건:
 * - 비자: 구직자 `visaCode`가 공고 `eligibleVisas` 안 (항상 적용 — 채용 가능 비자는 공고 데이터).
 * - 지역(`scope=strict`일 때): 희망 지역에 공고 시·도 또는 "어디든 가능"(ANY), 희망 지역이 비었으면
 *   거주 시·도가 공고 시·도.
 * - 업종(`scope=strict`일 때): 희망 업종이 비었거나 공고 업종을 포함.
 * `scope=visa`는 비자만 맞춘 넓은 목록(직원이 직접 판단). 정렬: 지역·업종 일치 수, 등급(S 먼저), 최근 갱신.
 *
 * 추천 실행은 같은 조건을 서버에서 다시 확인한 뒤 원장(src/lib/recommendations/ledger.ts)에 추가한다.
 * 화면에는 직원용 값만(등급·비자·시·도·희망 조건 코드) — 복호 필드는 읽지 않는다(PII_VIEW 없음).
 */
import type { Prisma, SeekerGrade } from "@prisma/client";

import { ADMIN_LIST_MAX, MATCHING_CANDIDATE_MAX } from "@/config/limits";
import { eligibleCandidateWhere } from "@/lib/candidates/eligible";
import { db } from "@/lib/db";
import { hasContacts } from "@/lib/pii-guard";
import { ANY_REGION } from "@/lib/seeker/options";

import { type CreateRecommendationResult, createRecommendation } from "./ledger";

type Client = typeof db;

export type MatchScope = "strict" | "visa";

/** Postings staff can recommend for: published and verified (BR-05). */
export const MATCHABLE_POSTING_WHERE = {
  status: "PUBLISHED",
  verifiedAt: { not: null },
  verifiedBy: { not: null },
} as const satisfies Prisma.JobPostingWhereInput;

export type MatchPosting = {
  id: string;
  companyId: string;
  sido: string;
  industryCode: string;
  eligibleVisas: string[];
};

/** Posting conditions as a seeker where clause (applied on top of eligibleCandidateWhere). */
export function postingMatchWhere(
  posting: Pick<MatchPosting, "sido" | "industryCode" | "eligibleVisas">,
  scope: MatchScope,
): Prisma.SeekerProfileWhereInput {
  const and: Prisma.SeekerProfileWhereInput[] = [{ visaCode: { in: posting.eligibleVisas } }];
  if (scope === "strict") {
    and.push({
      OR: [
        { desiredRegions: { hasSome: [posting.sido, ANY_REGION] } },
        { desiredRegions: { isEmpty: true }, sido: posting.sido },
      ],
    });
    and.push({
      OR: [
        { desiredIndustries: { isEmpty: true } },
        { desiredIndustries: { has: posting.industryCode } },
      ],
    });
  }
  return { AND: and };
}

const MATCH_SELECT = {
  id: true,
  grade: true,
  visaCode: true,
  visaSubType: true,
  sido: true,
  desiredRegions: true,
  desiredIndustries: true,
  jobSearchStatus: true,
  verifiedVisa: true,
  verifiedKorean: true,
  topikLevel: true,
  updatedAt: true,
} as const satisfies Prisma.SeekerProfileSelect;

export type MatchCandidate = Prisma.SeekerProfileGetPayload<{ select: typeof MATCH_SELECT }> & {
  regionMatch: boolean;
  industryMatch: boolean;
  /** Already recommended for this posting (or to this company without a posting). */
  recommendationId: string | null;
};

const GRADE_RANK: Readonly<Record<SeekerGrade, number>> = { B: 0, A: 1, S: 2 };

export function regionMatches(
  s: { desiredRegions: string[]; sido: string | null },
  sido: string,
): boolean {
  if (s.desiredRegions.length === 0) return s.sido === sido;
  return s.desiredRegions.includes(sido) || s.desiredRegions.includes(ANY_REGION);
}

export function industryMatches(s: { desiredIndustries: string[] }, industryCode: string): boolean {
  return s.desiredIndustries.length === 0 || s.desiredIndustries.includes(industryCode);
}

export async function getMatchPosting(id: string, client: Client = db) {
  if (typeof id !== "string" || id.length === 0 || id.length > 64) return null;
  return client.jobPosting.findFirst({
    where: { id, ...MATCHABLE_POSTING_WHERE },
    select: {
      id: true,
      companyId: true,
      blindTitle: true,
      role: true,
      sido: true,
      sigungu: true,
      industryCode: true,
      eligibleVisas: true,
      headcount: true,
      publishedAt: true,
    },
  });
}

/** Published, verified postings with their recommendation counts (matching overview). */
export async function listMatchPostings(client: Client = db, take = MATCHING_CANDIDATE_MAX) {
  return client.jobPosting.findMany({
    where: MATCHABLE_POSTING_WHERE,
    orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
    take,
    select: {
      id: true,
      blindTitle: true,
      role: true,
      sido: true,
      industryCode: true,
      eligibleVisas: true,
      headcount: true,
      publishedAt: true,
      _count: { select: { recommendations: true } },
    },
  });
}

/**
 * Number of all eligible seekers for one posting (the list shows at most MATCHING_CANDIDATE_MAX —
 * the page says "상위 n명 표시" when there are more, P2d 선행 A-7).
 */
export function countMatchCandidates(
  posting: MatchPosting,
  scope: MatchScope = "strict",
  now: Date = new Date(),
  client: Client = db,
): Promise<number> {
  return client.seekerProfile.count({
    where: { AND: [eligibleCandidateWhere(now), postingMatchWhere(posting, scope)] },
  });
}

/** Eligible seekers for one posting, best match first. */
export async function matchCandidates(
  posting: MatchPosting,
  scope: MatchScope = "strict",
  now: Date = new Date(),
  client: Client = db,
): Promise<MatchCandidate[]> {
  const rows = await client.seekerProfile.findMany({
    where: { AND: [eligibleCandidateWhere(now), postingMatchWhere(posting, scope)] },
    orderBy: [{ grade: "desc" }, { updatedAt: "desc" }, { id: "asc" }],
    take: MATCHING_CANDIDATE_MAX,
    select: MATCH_SELECT,
  });
  const recs = await client.recommendation.findMany({
    where: {
      postingId: posting.id,
      seekerId: { in: rows.map((r) => r.id) },
    },
    select: { id: true, seekerId: true },
  });
  const recOf = new Map(recs.map((r) => [r.seekerId, r.id]));
  return rows
    .map((r) => ({
      ...r,
      regionMatch: regionMatches(r, posting.sido),
      industryMatch: industryMatches(r, posting.industryCode),
      recommendationId: recOf.get(r.id) ?? null,
    }))
    .sort(
      (a, b) =>
        Number(b.regionMatch) +
          Number(b.industryMatch) -
          (Number(a.regionMatch) + Number(a.industryMatch)) ||
        GRADE_RANK[b.grade] - GRADE_RANK[a.grade] ||
        b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
}

export type RecommendResult =
  | ({ ok: true } & CreateRecommendationResult)
  | {
      ok: false;
      code: "POSTING_NOT_FOUND" | "NOT_ELIGIBLE" | "NOTE_HAS_CONTACT" | "INTEREST_NOT_FOUND";
    };

function cleanNote(note: string | null | undefined): string | null {
  const v = (note ?? "").trim();
  return v === "" ? null : v;
}

/**
 * 추천 실행 for a posting. The seeker must still be eligible AND match the posting's visas
 * (region / industry are the staff's call — scope `visa` lists them too).
 */
export async function recommendForPosting(
  args: { staffId: string; postingId: string; seekerId: string; note?: string | null; now?: Date },
  client: Client = db,
): Promise<RecommendResult> {
  const now = args.now ?? new Date();
  const note = cleanNote(args.note);
  if (note !== null && hasContacts(note)) return { ok: false, code: "NOTE_HAS_CONTACT" };
  const posting = await getMatchPosting(args.postingId, client);
  if (!posting) return { ok: false, code: "POSTING_NOT_FOUND" };
  const seeker = await client.seekerProfile.findFirst({
    where: {
      AND: [eligibleCandidateWhere(now), postingMatchWhere(posting, "visa"), { id: args.seekerId }],
    },
    select: { id: true },
  });
  if (!seeker) return { ok: false, code: "NOT_ELIGIBLE" };
  const interest = await client.interestRequest.findFirst({
    where: { seekerId: seeker.id, postingId: posting.id, status: "RECEIVED" },
    select: { id: true },
  });
  const r = await createRecommendation(
    {
      seekerId: seeker.id,
      companyId: posting.companyId,
      postingId: posting.id,
      staffId: args.staffId,
      note,
      interestRequestId: interest?.id ?? null,
      now,
    },
    client,
  );
  return { ok: true, ...r };
}

/**
 * Open 면접 신청 (SEEKER, with a posting) and 면접 요청 (EMPLOYER) waiting for a recommendation, newest
 * first, one page of `take` (ADMIN_LIST_MAX) rows with the total count, so a backlog never hides a new
 * request (P2c QA O-4). `page` is 1-based and clamped to the last page.
 */
export async function listOpenInterestRequests(
  opts: { now?: Date; page?: number; take?: number } = {},
  client: Client = db,
) {
  const now = opts.now ?? new Date();
  const take = opts.take ?? ADMIN_LIST_MAX;
  const where = { status: "RECEIVED" } as const;
  const total = await client.interestRequest.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / take));
  const wanted = Number.isInteger(opts.page) && (opts.page ?? 1) > 0 ? (opts.page as number) : 1;
  const page = Math.min(wanted, pageCount);
  const found = await client.interestRequest.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    skip: (page - 1) * take,
    take,
    select: {
      id: true,
      initiator: true,
      createdAt: true,
      seekerId: true,
      companyId: true,
      postingId: true,
      seeker: { select: { grade: true, visaCode: true, sido: true } },
      posting: { select: { blindTitle: true, companyId: true, status: true } },
    },
  });
  const eligible = new Set(
    (
      await client.seekerProfile.findMany({
        where: { AND: [eligibleCandidateWhere(now), { id: { in: found.map((r) => r.seekerId) } }] },
        select: { id: true },
      })
    ).map((r) => r.id),
  );
  const rows = found.map((r) => ({
    ...r,
    targetCompanyId: r.companyId ?? r.posting?.companyId ?? null,
    eligible: eligible.has(r.seekerId),
  }));
  return { rows, total, page, pageCount, take };
}

/**
 * 추천 실행 for one interest request (면접 요청 → the requesting company; 면접 신청 → the posting's
 * company). Same eligibility rule; the request becomes RECOMMENDED.
 */
export async function recommendForInterest(
  args: { staffId: string; interestRequestId: string; note?: string | null; now?: Date },
  client: Client = db,
): Promise<RecommendResult> {
  const now = args.now ?? new Date();
  const note = cleanNote(args.note);
  if (note !== null && hasContacts(note)) return { ok: false, code: "NOTE_HAS_CONTACT" };
  const request = await client.interestRequest.findUnique({
    where: { id: args.interestRequestId },
    select: {
      id: true,
      seekerId: true,
      companyId: true,
      postingId: true,
      posting: { select: { companyId: true, eligibleVisas: true } },
    },
  });
  const companyId = request?.companyId ?? request?.posting?.companyId ?? null;
  if (!request || !companyId) return { ok: false, code: "INTEREST_NOT_FOUND" };
  const and: Prisma.SeekerProfileWhereInput[] = [
    eligibleCandidateWhere(now),
    { id: request.seekerId },
  ];
  if (request.posting) and.push({ visaCode: { in: request.posting.eligibleVisas } });
  const seeker = await client.seekerProfile.findFirst({
    where: { AND: and },
    select: { id: true },
  });
  if (!seeker) return { ok: false, code: "NOT_ELIGIBLE" };
  const r = await createRecommendation(
    {
      seekerId: seeker.id,
      companyId,
      postingId: request.postingId,
      staffId: args.staffId,
      note,
      interestRequestId: request.id,
      now,
    },
    client,
  );
  return { ok: true, ...r };
}
