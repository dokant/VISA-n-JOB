/**
 * /seeker/me/recommended 추천 일자리 (PRD R-212, DECISIONS PC-13, BR-03).
 *
 * PC-13: "비자·지역·업종 일치 공개 공고 + 본인 추천 건".
 * 1. Matching public postings (`recommendedPostingsFor`): the public posting query
 *    (PUBLIC_POSTING_WHERE: PUBLISHED, verified, lead A) AND
 *    - 비자: the seeker's `visaCode` is in `eligibleVisas`,
 *    - 지역: the posting's 시·도 is in the seeker's 희망 지역 or 희망 지역 has "어디든 가능" (ANY); with no
 *      희망 지역 the seeker's 거주 시·도,
 *    - 업종: the posting's industry is in 희망 업종, or 희망 업종 is empty (no preference).
 *    Rows leave only as `PublicPosting` (serializers/publicPosting.ts). The page shows them only
 *    while FEATURE_PUBLIC_JOBS is on (SC-07: off → ComingSoon for this part).
 * 2. The seeker's own recommendations (`ownRecommendations`): date, industry and 시·도 of the posting
 *    (or of the company when there is no posting), interview dates and status. No company name,
 *    address, place or contact (BR-03). These are the seeker's own records, so they are shown with
 *    the flag off too; a link to the posting is given only when the posting is public and the flag
 *    is on.
 */
import { SEEKER_RECOMMENDED_POSTINGS_MAX } from "@/config/limits";
import { db } from "@/lib/db";
import { PUBLIC_POSTING_WHERE } from "@/lib/postings/public";
import { findRecommendations } from "@/lib/recommendations/ledger";
import {
  PUBLIC_POSTING_SELECT,
  type PublicPosting,
  serializePublicPosting,
} from "@/lib/serializers/publicPosting";

import { ANY_REGION, WIZARD_LAST_STEP } from "./options";

type Client = typeof db;

export type SeekerMatchFacts = {
  visaCode: string | null;
  sido: string | null;
  desiredRegions: string[];
  desiredIndustries: string[];
  completedStep: number;
};

async function factsOf(userId: string, client: Client): Promise<SeekerMatchFacts | null> {
  return client.seekerProfile.findUnique({
    where: { userId },
    select: {
      visaCode: true,
      sido: true,
      desiredRegions: true,
      desiredIndustries: true,
      completedStep: true,
    },
  });
}

/** null = the profile cannot be matched yet (no visa, or registration not finished). */
export async function recommendedPostingsFor(
  userId: string,
  client: Client = db,
): Promise<PublicPosting[] | null> {
  const s = await factsOf(userId, client);
  if (!s || !s.visaCode || s.completedStep < WIZARD_LAST_STEP) return null;
  const anyRegion = s.desiredRegions.includes(ANY_REGION);
  const regions = s.desiredRegions.length > 0 ? s.desiredRegions : s.sido ? [s.sido] : [];
  if (!anyRegion && regions.length === 0) return [];
  const rows = await client.jobPosting.findMany({
    where: {
      ...PUBLIC_POSTING_WHERE,
      eligibleVisas: { has: s.visaCode },
      ...(anyRegion ? {} : { sido: { in: regions } }),
      ...(s.desiredIndustries.length > 0 ? { industryCode: { in: s.desiredIndustries } } : {}),
    },
    select: PUBLIC_POSTING_SELECT,
    orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
    take: SEEKER_RECOMMENDED_POSTINGS_MAX,
  });
  return rows.map((r) => serializePublicPosting(r));
}

export type OwnRecommendation = {
  recommendedAt: Date;
  industryCode: string;
  sido: string;
  /** Posting id when the posting is public (the caller still checks FEATURE_PUBLIC_JOBS). */
  publicPostingId: string | null;
  interviews: { scheduledAt: Date; status: "SCHEDULED" | "CONFIRMED" | "CANCELLED" }[];
};

export async function ownRecommendations(
  userId: string,
  client: Client = db,
): Promise<OwnRecommendation[]> {
  const rows = await findRecommendations(
    {
      where: { seeker: { userId } },
      select: {
        recommendedAt: true,
        company: { select: { industryCode: true, sido: true } },
        posting: { select: { id: true, industryCode: true, sido: true } },
        interviews: {
          orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
          select: { scheduledAt: true, status: true },
        },
      },
    },
    client,
  );
  const postingIds = rows.flatMap((r) => (r.posting ? [r.posting.id] : []));
  const publicIds = new Set(
    (
      await client.jobPosting.findMany({
        where: { ...PUBLIC_POSTING_WHERE, id: { in: postingIds } },
        select: { id: true },
      })
    ).map((p) => p.id),
  );
  return rows.map((r) => {
    const where = r.posting ?? r.company;
    return {
      recommendedAt: r.recommendedAt,
      industryCode: where.industryCode,
      sido: where.sido,
      publicPostingId: r.posting && publicIds.has(r.posting.id) ? r.posting.id : null,
      interviews: r.interviews.map((i) => ({
        scheduledAt: i.scheduledAt,
        status:
          i.status === "CONFIRMED" || i.status === "CANCELLED" ? i.status : ("SCHEDULED" as const),
      })),
    };
  });
}
