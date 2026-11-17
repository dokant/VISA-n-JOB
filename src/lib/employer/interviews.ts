/**
 * 기업 면접 요청 현황 (PRD R-212, R-211; WO §6.3 `/requests`; BR-01, BR-02, PC-1).
 *
 * What one company sees about its own 면접 요청 and the interviews VISA n JOB arranged for it:
 * - 면접 요청 (InterestRequest initiator EMPLOYER): the blind id (`toBlindPublicId`, blindSeeker.ts),
 *   status and request time — nothing else about the seeker.
 * - 추천·면접 (Recommendation of this company → Interview): blind id, recommendation time, the
 *   company's own posting title, and per interview its date, place (staff text checked for contacts),
 *   status and whether the name is given. The real name is added ONLY by
 *   `loadInterviewDisclosure` (serializers/interviewDisclosure.ts) — consented, confirmed interviews
 *   of this company. Phone, e-mail and messenger never appear (BR-01; staff pass them on).
 * Used by the page `/[locale]/employer/requests` and `GET /api/employer/requests` alike.
 */
import { EMPLOYER_REQUESTS_LIST_MAX } from "@/config/limits";
import { db } from "@/lib/db";
import { findRecommendations } from "@/lib/recommendations/ledger";
import { INTERVIEW_CONSENT } from "@/lib/seeker/options";
import { toBlindPublicId } from "@/lib/serializers/blindSeeker";
import {
  type InterviewDisclosure,
  interviewEnded,
  loadInterviewDisclosure,
} from "@/lib/serializers/interviewDisclosure";

type Client = typeof db;

export type EmployerInterestRow = {
  publicId: string;
  /** RECEIVED (비자앤잡 확인 중) | RECOMMENDED (추천됨) | other codes as stored */
  status: string;
  requestedAt: string;
};

/**
 * Whether the name of this interview is given: asked / given / not given / not asked yet, or ENDED —
 * the interview was confirmed and has since been cancelled or got a final result, so the name is no
 * longer shown (DECISIONS Q-25, interviewDisclosure.ts).
 */
export type NameState = "NOT_ASKED" | "PENDING" | "GIVEN" | "NOT_GIVEN" | "ENDED";

export type EmployerInterviewRow = {
  interviewId: string;
  scheduledAt: string;
  place: string;
  status: "SCHEDULED" | "CONFIRMED" | "CANCELLED";
  nameState: NameState;
  /** Only for a consented, confirmed interview of this company (interviewDisclosure.ts). */
  disclosure: InterviewDisclosure | null;
};

export type EmployerRecommendationRow = {
  publicId: string;
  recommendedAt: string;
  postingTitle: string | null;
  interviews: EmployerInterviewRow[];
};

export type EmployerRequests = {
  interestRequests: EmployerInterestRow[];
  recommendations: EmployerRecommendationRow[];
};

function interviewStatus(v: string): EmployerInterviewRow["status"] {
  return v === "CONFIRMED" || v === "CANCELLED" ? v : "SCHEDULED";
}

export async function loadEmployerRequests(
  actor: { id: string; companyId: string },
  client: Client = db,
): Promise<EmployerRequests> {
  const [interests, recs] = await Promise.all([
    client.interestRequest.findMany({
      where: { companyId: actor.companyId, initiator: "EMPLOYER" },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: EMPLOYER_REQUESTS_LIST_MAX,
      select: { status: true, createdAt: true, seeker: { select: { publicId: true } } },
    }),
    findRecommendations(
      {
        where: { companyId: actor.companyId },
        take: EMPLOYER_REQUESTS_LIST_MAX,
        select: {
          recommendedAt: true,
          seeker: { select: { publicId: true, userId: true } },
          posting: { select: { blindTitle: true } },
          interviews: {
            orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
            select: {
              id: true,
              scheduledAt: true,
              place: true,
              status: true,
              result: true,
              confirmedAt: true,
              consentDeclinedAt: true,
              consents: {
                where: { type: INTERVIEW_CONSENT, revokedAt: null },
                select: { userId: true },
              },
            },
          },
        },
      },
      client,
    ),
  ]);

  const recommendations: EmployerRecommendationRow[] = [];
  for (const r of recs) {
    const interviews: EmployerInterviewRow[] = [];
    for (const iv of r.interviews) {
      const status = interviewStatus(iv.status);
      const consented = iv.consents.some((c) => c.userId === r.seeker.userId);
      const ended = interviewEnded(iv);
      const disclosure =
        status === "CONFIRMED" && !ended && consented
          ? await loadInterviewDisclosure(
              { companyId: actor.companyId, interviewId: iv.id, actorId: actor.id },
              client,
            )
          : null;
      const nameState: NameState =
        ended && iv.confirmedAt
          ? "ENDED"
          : status !== "CONFIRMED"
            ? "NOT_ASKED"
            : disclosure
              ? "GIVEN"
              : iv.consentDeclinedAt
                ? "NOT_GIVEN"
                : "PENDING";
      interviews.push({
        interviewId: iv.id,
        scheduledAt: iv.scheduledAt.toISOString(),
        place: iv.place,
        status,
        nameState,
        disclosure,
      });
    }
    recommendations.push({
      publicId: toBlindPublicId(r.seeker.publicId),
      recommendedAt: r.recommendedAt.toISOString(),
      postingTitle: r.posting?.blindTitle ?? null,
      interviews,
    });
  }

  return {
    interestRequests: interests.map((i) => ({
      publicId: toBlindPublicId(i.seeker.publicId),
      status: i.status,
      requestedAt: i.createdAt.toISOString(),
    })),
    recommendations,
  };
}
