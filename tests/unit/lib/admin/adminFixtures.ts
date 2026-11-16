/** Shared rows for the P1e admin tests (the test DB is shared and never cleaned: unique tags). */
import type { Prisma, Role } from "@prisma/client";

import { db } from "@/lib/db";

import { uniq } from "../../db/helpers";

export const DAY_MS = 86_400_000;

export async function staffUser(role: Role = "STAFF_VISA") {
  return db.user.create({
    data: { role, email: `${uniq("staff")}@example.test`, displayName: "테스트 직원" },
  });
}

/** One seeker; `tag` goes to sourceChannel so a test can scope its own rows. */
export async function seeker(
  tag: string,
  over: Partial<Prisma.SeekerProfileUncheckedCreateInput> = {},
) {
  const user = await db.user.create({ data: { role: "SEEKER" } });
  return db.seekerProfile.create({
    data: {
      userId: user.id,
      referralCode: uniq("R").slice(-24),
      sourceChannel: tag,
      ...over,
    },
  });
}

export async function lead(tag: string, over: Partial<Prisma.JobLeadUncheckedCreateInput> = {}) {
  return db.jobLead.create({
    data: {
      source: "MANUAL",
      sourceRef: uniq(tag),
      companyName: "테스트 기업",
      title: "생산직",
      sido: "SEOUL",
      rawJson: {},
      grade: "C",
      ...over,
    },
  });
}

export function auditRows(entityId: string, action?: string) {
  return db.auditLog.findMany({
    where: { entityId, ...(action ? { action } : {}) },
    orderBy: { at: "asc" },
  });
}
