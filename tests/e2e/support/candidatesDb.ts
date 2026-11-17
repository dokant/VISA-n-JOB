/**
 * E2E fixtures for P2b (R-204 ~ R-208, R-218): employer-visible seekers, employer accounts with or
 * without verification / contract, and read-backs of what the server under test wrote. Local
 * development database; unique values; nothing is deleted.
 *
 * Seekers are tagged with a unique `convertibleVisa` code and the tests filter the candidate list by
 * it (`?convertible=`), so rows from earlier runs never change what a test sees.
 */
import { randomInt, randomUUID } from "node:crypto";

import { type Page, expect } from "@playwright/test";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

import "./authDb"; // loads .env (DATABASE_URL, keys) for the fixtures below
import { uniqueEmail } from "./authDb";
import { waitForHydration } from "./seekerFlow";

export const EMPLOYER_PASSWORD = "e2e-employer-pass-2";
/** Values that must never appear on an employer screen. */
export const HIDDEN_NAME = "E2E HIDDEN SEEKERNAME";
export const HIDDEN_EMAIL = "hidden.seeker.e2e@example.test";

/** Origin of the FEATURE_EMPLOYER_CANDIDATES=true server ("localhost" for the session cookie). */
export function candidatesURL(): string {
  return `http://localhost:${process.env.E2E_CANDIDATES_PORT ?? 3103}`;
}

export function e2eTag(): string {
  return `E2E-${randomUUID().slice(0, 8)}`;
}

function months(n: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + n, 1));
}

export async function createCandidate(
  tag: string,
  over: { grade?: "S" | "A"; visaCode?: string; track?: "JOB_MATCH" | "FUTURE_POOL" } = {},
) {
  // P2d 선행 A-5: filter codes outside the VisaType list are ignored, so the tag is registered as an
  // inactive, non-status VisaType (never offered on a public screen, sent to companies as null).
  await db.visaType.upsert({
    where: { code: tag },
    create: {
      code: tag,
      nameKey: "visaType.other.name",
      registrable: false,
      isStatusCode: false,
      active: false,
      sortOrder: 9999,
      note: "E2E filter tag (candidate isolation), not a visa",
    },
    update: {},
  });
  const user = await db.user.create({ data: { role: "SEEKER" } });
  const profile = await db.seekerProfile.create({
    data: {
      userId: user.id,
      referralCode: `E2EC${randomUUID().replace(/-/g, "").slice(0, 14).toUpperCase()}`,
      legalNameEnc: HIDDEN_NAME,
      emailEnc: HIDDEN_EMAIL,
      major: "free text major 010-3333-4444",
      majorField: "ENGINEERING",
      birthYear: 1993,
      gender: "FEMALE",
      nationality: "VN",
      sido: "CHUNGNAM",
      visaCode: over.visaCode ?? "F-4",
      stayExpiry: months(14),
      entryYear: 2019,
      hasArc: true,
      educationLevel: "BACHELOR",
      graduationDate: months(-40),
      topikLevel: 4,
      kiipStage: 3,
      koreanSpeaking: 3,
      otherLanguages: ["en", "vi"],
      skills: ["WELDING", "FORKLIFT"],
      licenses: ["FORKLIFT_LICENSE"],
      desiredIndustries: ["C"],
      desiredRegions: ["CHUNGNAM"],
      needDormitory: true,
      shiftOk: "YES",
      desiredPayMin: 2_800_000,
      jobSearchStatus: "IMMEDIATE",
      track: over.track ?? "JOB_MATCH",
      grade: over.grade ?? "A",
      verifiedVisa: true,
      verifiedKorean: over.grade === "S",
      consultedAt: new Date(),
      convertibleVisa: tag,
      status: "ACTIVE",
      completedStep: 7,
      experiences: {
        create: [
          {
            country: "KR",
            industryCode: "C",
            role: "WELDING",
            months: 18 + randomInt(10),
            employerNameEnc: "Hidden Employer Co",
          },
        ],
      },
    },
    select: { id: true, publicId: true },
  });
  await db.consent.create({
    data: { userId: user.id, type: "BLIND_PROFILE", version: "v1", locale: "ko" },
  });
  return profile;
}

export async function createCandidateEmployer(
  opts: { verified?: boolean; contracted?: boolean } = {},
): Promise<{ email: string; companyId: string }> {
  const email = uniqueEmail("e2e-candidates");
  const user = await db.user.create({
    data: {
      role: "EMPLOYER",
      email,
      password: await hashPassword(EMPLOYER_PASSWORD),
      company: {
        create: {
          nameEnc: "이투이 후보 열람 제조",
          industryCode: "C",
          sido: "CHUNGNAM",
          verified: opts.verified ?? false,
          verifiedAt: opts.verified ? new Date() : null,
          contractSignedAt: opts.contracted ? new Date() : null,
          contractVersion: opts.contracted ? "v1" : null,
        },
      },
    },
    select: { companyId: true },
  });
  return { email, companyId: user.companyId as string };
}

export async function loginEmployer(page: Page, email: string, next: string) {
  await page.goto(`/ko/employer/login?next=${next}`);
  await waitForHydration(page, "employer-login-form");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(EMPLOYER_PASSWORD);
  await page.locator('[data-testid="employer-login-form"] button[type="submit"]').click();
  await expect(page).toHaveURL(new RegExp(`/ko${next.replace(/\?.*$/, "")}`));
}

export function employerInterestRequests(companyId: string) {
  return db.interestRequest.findMany({
    where: { companyId, initiator: "EMPLOYER" },
    select: { seekerId: true, status: true },
  });
}

export function candidateViewAudits(companyId: string) {
  return db.auditLog.findMany({
    where: { action: "CANDIDATE_BULK_VIEW", entityId: companyId },
    select: { meta: true },
  });
}

export function companyRow(companyId: string) {
  return db.company.findUniqueOrThrow({
    where: { id: companyId },
    select: {
      verified: true,
      contractSignedAt: true,
      contractVersion: true,
      visaMandateAgreed: true,
    },
  });
}

export function companyAudits(companyId: string) {
  return db.auditLog.findMany({
    where: { action: "COMPANY_VERIFY", entityId: companyId },
    orderBy: { at: "asc" },
    select: { meta: true },
  });
}
