/**
 * E2E fixtures for P1e (R-119 ~ R-122): a seeker and a lead in the local development database, and
 * read-backs of the AuditLog rows the server under test wrote. Unique values; nothing is deleted.
 */
import { randomUUID } from "node:crypto";

import { expect, type Page } from "@playwright/test";

import { db } from "@/lib/db";

import { STAFF_PASSWORD, createStaff, totpCodeAt } from "./authDb";
import { waitForHydration } from "./seekerFlow";

export async function createReviewSeeker(
  over: { consulted?: boolean; verifiedVisa?: boolean } = {},
) {
  const user = await db.user.create({ data: { role: "SEEKER" } });
  const s = await db.seekerProfile.create({
    data: {
      userId: user.id,
      referralCode: `E2E${randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`,
      legalNameEnc: "E2E REVIEW NAME",
      consultedAt: over.consulted ? new Date() : null,
      verifiedVisa: over.verifiedVisa ?? false,
    },
  });
  return s.id;
}

export async function createCallLead(grade: "C" | "ARCHIVED" = "C") {
  const sido = await db.region.findFirstOrThrow({
    where: { level: "SIDO" },
    select: { code: true },
  });
  const l = await db.jobLead.create({
    data: {
      source: "MANUAL",
      sourceRef: `E2E-ADMIN:${randomUUID()}`,
      companyName: "이투이 전화 제조",
      title: "E2E 생산직",
      sido: sido.code,
      rawJson: {},
      grade,
      archivedAt: grade === "ARCHIVED" ? new Date() : null,
      contactNameEnc: "이투이 담당",
    },
  });
  return l.id;
}

export function auditFor(entityId: string, action: string) {
  return db.auditLog.findMany({ where: { entityId, action }, orderBy: { at: "asc" } });
}

export function callCount(leadId: string) {
  return db.callLog.count({ where: { leadId } });
}

export function leadGrade(id: string) {
  return db.jobLead.findUniqueOrThrow({ where: { id }, select: { grade: true } });
}

/** New staff account → password login → TOTP setup → /admin (R-118). Returns the staff id. */
export async function signInNewStaff(
  page: Page,
  role: "ADMIN" | "STAFF_PLACEMENT" | "STAFF_VISA",
): Promise<string> {
  const email = await createStaff(role);
  await page.goto("/admin/login");
  await waitForHydration(page, "staff-login-form");
  await page.getByLabel("이메일").fill(email);
  await page.getByLabel("비밀번호").fill(STAFF_PASSWORD);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/admin\/2fa\/setup$/);
  await waitForHydration(page, "totp-form");
  const secret = (await page.getByTestId("totp-secret").innerText()).replace(/\s+/g, "");
  await page.getByLabel("인증 앱의 6자리 코드").fill(totpCodeAt(secret));
  await page.getByRole("button", { name: "설정 완료" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  const user = await db.user.findUniqueOrThrow({ where: { email }, select: { id: true } });
  return user.id;
}
