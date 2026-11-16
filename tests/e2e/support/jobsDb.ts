/**
 * E2E fixtures for P2a (R-201 ~ R-203): grade-A leads, public postings and seekers with a visa in
 * the local development database. Unique values; nothing is deleted.
 */
import { randomUUID } from "node:crypto";
import path from "node:path";

import type { LeadGrade } from "@prisma/client";
import type { Page, TestInfo } from "@playwright/test";

import { db } from "@/lib/db";
import { phoneHashOf } from "@/lib/otp";

import "./authDb"; // loads .env (DATABASE_URL, keys) for the fixtures below

/** Origin of the FEATURE_PUBLIC_JOBS=true server ("localhost" for the session cookie). */
export function jobsURL(): string {
  return `http://localhost:${process.env.E2E_JOBS_PORT ?? 3102}`;
}

/** Company name of every E2E lead: must never appear on a public page. */
export const E2E_COMPANY = "이투이공고정밀 주식회사";

export async function createLead(grade: LeadGrade) {
  const lead = await db.jobLead.create({
    data: {
      source: "MANUAL",
      sourceRef: `E2E-POSTING:${randomUUID()}`,
      companyName: E2E_COMPANY,
      title: "이투이공고정밀 생산직 모집 (리드 제목)",
      sido: "SEOUL",
      industryCode: "C",
      payMin: 2_700_000,
      rawJson: {},
      grade,
      requestedAt: grade === "A" ? new Date() : null,
    },
  });
  return lead.id;
}

/** A PUBLISHED + verified posting written directly (the admin flow is tested separately). */
export async function createPublicPosting(
  opts: { leadGrade?: LeadGrade; eligibleVisas?: string[]; title?: string } = {},
) {
  const leadId = await createLead(opts.leadGrade ?? "A");
  const company = await db.company.create({
    data: { nameEnc: E2E_COMPANY, industryCode: "C", sido: "SEOUL" },
  });
  const now = new Date();
  const posting = await db.jobPosting.create({
    data: {
      companyId: company.id,
      leadId,
      blindTitle: opts.title ?? `서울 제조업 생산직 E2E ${randomUUID().slice(0, 6)}`,
      industryCode: "C",
      sido: "SEOUL",
      role: "생산직",
      payMin: 2_600_000,
      payMax: 3_100_000,
      overtimeNote: "SOMETIMES",
      dormitory: "FREE",
      meals: "PROVIDED",
      shift: "TWO_SHIFT",
      headcount: 3,
      eligibleVisas: opts.eligibleVisas ?? ["F-4", "H-2"],
      status: "PUBLISHED",
      verifiedBy: "e2e-staff",
      verifiedAt: now,
      publishedAt: now,
    },
  });
  return posting.id;
}

/** A seeker account (phone login) with a profile holding `visaCode`. */
export async function createSeekerWithVisa(phone: string, visaCode: string) {
  const user = await db.user.create({
    data: { role: "SEEKER", phoneEnc: phone, phoneHash: phoneHashOf(phone) },
  });
  await db.seekerProfile.create({
    data: {
      userId: user.id,
      referralCode: `E2E${randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`,
      visaCode,
      sido: "SEOUL",
    },
  });
  return user.id;
}

/** Changes a seeker's visa / status after the page was opened (P2a QA O-2, BLOCKED panel). */
export async function updateSeeker(
  userId: string,
  data: { visaCode?: string; status?: "BLOCKED" },
): Promise<void> {
  await db.seekerProfile.update({ where: { userId }, data });
}

export function interestRequestsOf(postingId: string) {
  return db.interestRequest.findMany({
    where: { postingId },
    select: { initiator: true, status: true, seekerId: true },
  });
}

export function followupTasksOf(postingId: string) {
  return db.staffTask.findMany({
    where: { type: "INTEREST_FOLLOWUP", payload: { path: ["postingId"], equals: postingId } },
    select: { status: true, assigneeRole: true },
  });
}

export function postingOf(id: string) {
  return db.jobPosting.findUniqueOrThrow({
    where: { id },
    select: { status: true, verifiedAt: true, verifiedBy: true, publishedAt: true },
  });
}

/**
 * Review screenshots (1280 desktop / 375 mobile project) when P2A_SHOTS_DIR is set; otherwise
 * nothing is written.
 */
export async function shot(page: Page, testInfo: TestInfo, name: string) {
  const dir = process.env.P2A_SHOTS_DIR;
  if (!dir) return;
  const suffix = testInfo.project.name === "mobile-375" ? "375" : "1280";
  await page.screenshot({ path: path.join(dir, `p2a_${name}_${suffix}.png`), fullPage: true });
}
