/** Shared rows for the P2a posting tests (the test DB is shared and never cleaned: unique tags). */
import type { LeadGrade, Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import type { PostingCreateInput } from "@/schemas/admin/postings";

import { uniq } from "../../db/helpers";

export const COMPANY_NAME = "한빛정밀 주식회사";

export async function gradedLead(
  grade: LeadGrade,
  over: Partial<Prisma.JobLeadUncheckedCreateInput> = {},
) {
  return db.jobLead.create({
    data: {
      source: "MANUAL",
      sourceRef: uniq("posting-lead"),
      companyName: COMPANY_NAME,
      title: "한빛정밀 생산직 모집",
      sido: "SEOUL",
      industryCode: "C",
      rawJson: {},
      grade,
      ...over,
    },
  });
}

export function postingInput(
  leadId: string,
  over: Partial<PostingCreateInput> = {},
): PostingCreateInput {
  return {
    leadId,
    blindTitle: "서울 제조업 생산직 (숙소 제공)",
    role: "생산직",
    industryCode: "C",
    sido: "SEOUL",
    sigungu: null,
    payMin: 2_600_000,
    payMax: 3_000_000,
    overtimeNote: "SOMETIMES",
    dormitory: "FREE",
    meals: "PROVIDED",
    shift: "TWO_SHIFT",
    headcount: 3,
    eligibleVisas: ["F-4", "H-2"],
    ...over,
  };
}

/** A posting row written directly (bypasses the app checks) — for query-layer tests. */
export async function rawPosting(
  leadGrade: LeadGrade,
  over: Partial<Prisma.JobPostingUncheckedCreateInput> = {},
) {
  const lead = await gradedLead(leadGrade);
  const company = await db.company.create({
    data: { nameEnc: COMPANY_NAME, industryCode: "C", sido: "SEOUL" },
  });
  const now = new Date();
  const posting = await db.jobPosting.create({
    data: {
      companyId: company.id,
      leadId: lead.id,
      blindTitle: `블라인드 ${uniq("p")}`,
      industryCode: "C",
      sido: "SEOUL",
      role: "생산직",
      payMin: 2_500_000,
      dormitory: "NONE",
      headcount: 2,
      eligibleVisas: ["F-4"],
      status: "PUBLISHED",
      verifiedBy: "staff-test",
      verifiedAt: now,
      publishedAt: now,
      ...over,
    },
  });
  return { lead, company, posting };
}

export async function seekerUser(
  visaCode: string | null,
  over: Partial<Prisma.SeekerProfileUncheckedCreateInput> = {},
) {
  const user = await db.user.create({ data: { role: "SEEKER" } });
  const profile = await db.seekerProfile.create({
    data: { userId: user.id, referralCode: uniq("R").slice(-24), visaCode, ...over },
  });
  return { user, profile };
}
