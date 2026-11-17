/**
 * P2c fixtures (R-209 ~ R-212): a contracted company with an employer account, a published and
 * verified posting, placement staff, and employer-visible seekers. The shared test DB is never
 * cleaned, so every setup uses a unique code as the posting's only eligible visa and as the
 * seekers' `visaCode` — matching queries then see only this test's seekers.
 */
import type { Role } from "@prisma/client";

import { db } from "@/lib/db";
import { createRecommendation } from "@/lib/recommendations/ledger";

import { uniq } from "../../db/helpers";
import { staffUser } from "../admin/adminFixtures";
import { type SeekerOver, candidate, company, tag } from "../candidates/candidateFixtures";

export type MatchSetup = Awaited<ReturnType<typeof matchSetup>>;

export async function matchSetup(prefix = "M", staffRole: Role = "STAFF_PLACEMENT") {
  const visa = tag(prefix);
  const employer = await company({ verified: true, contracted: true });
  const lead = await db.jobLead.create({
    data: {
      source: "MANUAL",
      sourceRef: uniq("p2c-lead"),
      companyName: "매칭 테스트 기업",
      title: "생산직",
      sido: "SEOUL",
      industryCode: "C",
      rawJson: {},
      grade: "A",
      companyId: employer.companyId,
    },
  });
  const now = new Date();
  const posting = await db.jobPosting.create({
    data: {
      companyId: employer.companyId,
      leadId: lead.id,
      blindTitle: `매칭 공고 ${uniq("t")}`,
      industryCode: "C",
      sido: "SEOUL",
      role: "생산직",
      payMin: 2_500_000,
      dormitory: "NONE",
      headcount: 2,
      eligibleVisas: [visa],
      status: "PUBLISHED",
      verifiedBy: "staff-test",
      verifiedAt: now,
      publishedAt: now,
    },
  });
  const staff = await staffUser(staffRole);
  return { visa, employer, posting, staff };
}

/** An employer-visible seeker holding the setup's visa (S·A, JOB_MATCH, BLIND_PROFILE given). */
export function matchSeeker(setup: { visa: string }, over: SeekerOver = {}) {
  return candidate(tag("cv"), {
    visaCode: setup.visa,
    desiredIndustries: ["C"],
    desiredRegions: ["SEOUL"],
    ...over,
  });
}

/** Recommendation (ledger) + one interview for `seekerId` → the setup's company. */
export async function recommendedInterview(
  setup: MatchSetup,
  seekerId: string,
  status: "SCHEDULED" | "CONFIRMED" | "CANCELLED" = "CONFIRMED",
) {
  const { recommendation } = await createRecommendation({
    seekerId,
    companyId: setup.employer.companyId,
    postingId: setup.posting.id,
    staffId: setup.staff.id,
    note: null,
  });
  const interview = await db.interview.create({
    data: {
      recommendationId: recommendation.id,
      scheduledAt: new Date(Date.now() + 3 * 86_400_000),
      place: "본사 2층 회의실",
      status,
      confirmedAt: status === "CONFIRMED" ? new Date() : null,
    },
  });
  return { recommendation, interview };
}
