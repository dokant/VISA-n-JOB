/**
 * E2E fixtures for P2c (R-209 ~ R-212, R-216): a contracted employer with a published posting, a
 * phone-login seeker who is employer-visible (grade A, JOB_MATCH, BLIND_PROFILE), recommendations
 * and interviews written through the ledger repository. Local development database; unique values
 * (a unique visa tag per test, a unique name); nothing is deleted.
 */
import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { phoneHashOf } from "@/lib/otp";
import { createRecommendation } from "@/lib/recommendations/ledger";

import "./authDb"; // loads .env (DATABASE_URL, keys) for the fixtures below
import { createStaff, uniqueEmail } from "./authDb";
import { EMPLOYER_PASSWORD } from "./candidatesDb";

export function uniqueTag(): string {
  return `E2EV-${randomUUID().slice(0, 8)}`;
}

/** A distinct readable name per test (must appear only where consent allows). */
export function uniqueName(): string {
  return `E2E NAME ${randomUUID().slice(0, 6).toUpperCase()}`;
}

function months(n: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + n, 1));
}

/** Employer (password login) + company (verified, contracted) + lead A + published posting. */
export async function createMatchEmployer(visa: string) {
  const email = uniqueEmail("e2e-requests");
  const user = await db.user.create({
    data: {
      role: "EMPLOYER",
      email,
      password: await hashPassword(EMPLOYER_PASSWORD),
      company: {
        create: {
          nameEnc: "이투이 면접 요청 제조",
          industryCode: "C",
          sido: "SEOUL",
          verified: true,
          verifiedAt: new Date(),
          contractSignedAt: new Date(),
          contractVersion: "v1",
        },
      },
    },
    select: { companyId: true },
  });
  const companyId = user.companyId as string;
  const lead = await db.jobLead.create({
    data: {
      source: "MANUAL",
      sourceRef: `E2E-P2C:${randomUUID()}`,
      companyName: "이투이 면접 요청 제조",
      title: "생산직",
      sido: "SEOUL",
      industryCode: "C",
      rawJson: {},
      grade: "A",
      companyId,
    },
  });
  const now = new Date();
  const posting = await db.jobPosting.create({
    data: {
      companyId,
      leadId: lead.id,
      blindTitle: `서울 제조 생산직 P2C ${randomUUID().slice(0, 6)}`,
      industryCode: "C",
      sido: "SEOUL",
      role: "생산직",
      payMin: 2_600_000,
      payMax: 3_000_000,
      dormitory: "FREE",
      headcount: 2,
      eligibleVisas: [visa],
      status: "PUBLISHED",
      verifiedBy: "e2e-staff",
      verifiedAt: now,
      publishedAt: now,
    },
  });
  return { email, companyId, postingId: posting.id };
}

/** Phone-login seeker visible to employers, holding `visa`, with the real name `name`. */
export async function createMatchSeeker(phone: string, visa: string, name: string) {
  const user = await db.user.create({
    data: { role: "SEEKER", phoneEnc: phone, phoneHash: phoneHashOf(phone), locale: "ko" },
  });
  const profile = await db.seekerProfile.create({
    data: {
      userId: user.id,
      referralCode: `E2EM${randomUUID().replace(/-/g, "").slice(0, 14).toUpperCase()}`,
      legalNameEnc: name,
      emailEnc: "p2c.hidden@example.test",
      nationality: "VN",
      sido: "SEOUL",
      visaCode: visa,
      stayExpiry: months(18),
      entryYear: 2020,
      hasArc: true,
      educationLevel: "BACHELOR",
      koreanSpeaking: 3,
      desiredIndustries: ["C"],
      desiredRegions: ["SEOUL"],
      needDormitory: true,
      shiftOk: "YES",
      jobSearchStatus: "IMMEDIATE",
      track: "JOB_MATCH",
      grade: "A",
      verifiedVisa: true,
      consultedAt: new Date(),
      status: "ACTIVE",
      completedStep: 7,
    },
    select: { id: true, userId: true },
  });
  for (const type of ["PRIVACY_REQUIRED", "BLIND_PROFILE", "NOTICE"]) {
    await db.consent.create({ data: { userId: user.id, type, version: "v1", locale: "ko" } });
  }
  return profile;
}

/** Ledger recommendation + one interview (status as asked). */
export async function createRecommendedInterview(args: {
  seekerId: string;
  companyId: string;
  postingId: string;
  status: "SCHEDULED" | "CONFIRMED";
}) {
  const staffEmail = await createStaff("STAFF_PLACEMENT");
  const staff = await db.user.findUniqueOrThrow({
    where: { email: staffEmail },
    select: { id: true },
  });
  const { recommendation } = await createRecommendation({
    seekerId: args.seekerId,
    companyId: args.companyId,
    postingId: args.postingId,
    staffId: staff.id,
    note: null,
  });
  const interview = await db.interview.create({
    data: {
      recommendationId: recommendation.id,
      scheduledAt: new Date(Date.now() + 5 * 86_400_000),
      place: "본사 2층 회의실",
      status: args.status,
      confirmedAt: args.status === "CONFIRMED" ? new Date() : null,
    },
  });
  return { recommendationId: recommendation.id, interviewId: interview.id };
}

export function interviewConsents(interviewId: string) {
  return db.consent.findMany({
    where: { interviewId, type: "THIRD_PARTY_INTERVIEW" },
    select: { revokedAt: true },
  });
}

export function recommendationsOf(seekerId: string) {
  return db.recommendation.findMany({ where: { seekerId }, select: { id: true, staffId: true } });
}

export function interviewsOf(recommendationId: string) {
  return db.interview.findMany({
    where: { recommendationId },
    select: { id: true, status: true, introConfirmFile: true },
  });
}

export function visaCasesOf(seekerId: string) {
  return db.visaCase.findMany({ where: { seekerId }, select: { id: true, status: true } });
}
