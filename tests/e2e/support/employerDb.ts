/**
 * E2E fixtures for P1d (R-124, R-125): an employer account in the local development database, and
 * read-backs of the leads the server under test wrote. Unique e-mails; nothing is deleted (dev DB).
 */
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

import { uniqueEmail } from "./authDb";

export const EMPLOYER_PASSWORD = "e2e-employer-pass-1";

export async function createEmployerAccount(): Promise<{ email: string; companyId: string }> {
  const [industry, sido] = await Promise.all([
    db.industry.findFirstOrThrow({ orderBy: { sortOrder: "asc" }, select: { code: true } }),
    db.region.findFirstOrThrow({
      where: { level: "SIDO" },
      orderBy: { sortOrder: "asc" },
      select: { code: true },
    }),
  ]);
  const email = uniqueEmail("e2e-request");
  const user = await db.user.create({
    data: {
      role: "EMPLOYER",
      email,
      password: await hashPassword(EMPLOYER_PASSWORD),
      company: {
        create: { nameEnc: "이투이 구인 제조", industryCode: industry.code, sido: sido.code },
      },
    },
    select: { companyId: true },
  });
  return { email, companyId: user.companyId as string };
}

export async function leadsOfCompany(companyId: string) {
  return db.jobLead.findMany({
    where: { companyId },
    select: { grade: true, source: true, title: true, requestJson: true },
  });
}

export async function reviewTasksOfCompany(companyId: string) {
  return db.staffTask.findMany({
    where: { companyId, type: "LEAD_REVIEW" },
    select: { status: true, assigneeRole: true },
  });
}
