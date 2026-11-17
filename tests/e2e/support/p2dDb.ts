/**
 * P2d E2E data (R-213 still-searching link, R-215 rules / score tables) in the local development
 * database. Unique values; nothing is deleted. The test visa code is an inactive VisaType, so a rule
 * published by the test never reaches a public screen of the development site.
 */
import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { signStillSearchingToken } from "@/lib/seeker/stillSearching";

/** Inactive, non-status VisaType used only by one rules test (never offered on public screens). */
export async function createE2eVisa(): Promise<string> {
  const code = `E2ER-${randomUUID().slice(0, 8)}`;
  await db.visaType.create({
    data: {
      code,
      nameKey: "visaType.other.name",
      registrable: false,
      isStatusCode: false,
      active: false,
      sortOrder: 9999,
      note: "E2E test code (R-215 rules screen), not a visa",
    },
  });
  return code;
}

/** A seeker with an open 30-day status check sent `sentAt`, and the token of that check. */
export async function createStatusCheckSeeker(sentAt: Date = new Date()) {
  const user = await db.user.create({ data: { role: "SEEKER", locale: "ko" } });
  const s = await db.seekerProfile.create({
    data: {
      userId: user.id,
      referralCode: `E2ES${randomUUID().replace(/-/g, "").slice(0, 14).toUpperCase()}`,
      track: "JOB_MATCH",
      status: "ACTIVE",
      lastActiveConfirmedAt: new Date(sentAt.getTime() - 31 * 86_400_000),
      statusCheckSentAt: sentAt,
    },
  });
  return { seekerId: s.id, token: signStillSearchingToken(s.id, sentAt) };
}

export function seekerStatus(id: string) {
  return db.seekerProfile.findUniqueOrThrow({
    where: { id },
    select: { status: true, statusCheckSentAt: true, lastActiveConfirmedAt: true },
  });
}

export function ruleRow(id: string) {
  return db.visaRule.findUniqueOrThrow({ where: { id } });
}

export function scoreTableRow(id: string) {
  return db.scoreTable.findUniqueOrThrow({ where: { id } });
}

export function ruleAudit(entityId: string) {
  return db.auditLog.findMany({
    where: { entityId, action: "RULE_PUBLISH" },
    orderBy: { at: "asc" },
  });
}
