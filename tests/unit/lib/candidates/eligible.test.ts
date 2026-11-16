/**
 * R-113 / WO15-08: BLIND_PROFILE 철회 즉시 기업 후보 쿼리에서 제외. Also BR-06 / BR-07 query rules
 * (S·A, JOB_MATCH, ACTIVE, finished) and the CONSENT_REVOKE audit row (BR-15).
 */
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  eligibleCandidateIds,
  eligibleCandidateWhere,
  isEligibleCandidate,
} from "@/lib/candidates/eligible";
import { grantConsent, revokeConsent } from "@/lib/seeker/consent";
import { isStayExpired, notExpiredFrom } from "@/lib/visa-engine/classifyTrack";

import { fillSteps, save, wizardAccount } from "../seeker/seekerFixtures";

const ALL = { privacyRequired: true, blindProfile: true, marketing: true, notice: true };

/** A finished seeker promoted to grade A by staff (P1e does this through the admin screen). */
async function gradeASeeker(visaCode = "F-4") {
  const userId = await wizardAccount();
  await fillSteps(userId, { visaCode });
  const r = await save(userId, "7", { ...ALL, blindProfile: visaCode !== "E-9" });
  if (!r.ok) throw new Error(JSON.stringify(r));
  const p = await db.seekerProfile.update({
    where: { userId },
    data: { grade: "A", verifiedVisa: true },
    select: { id: true },
  });
  return { userId, seekerId: p.id };
}

describe("R-113 candidate eligibility (query layer)", () => {
  it("R-113 WO15-08: revoking BLIND_PROFILE removes the seeker from candidate queries at once", async () => {
    const { userId, seekerId } = await gradeASeeker();
    expect(await isEligibleCandidate(seekerId)).toBe(true);
    expect(await eligibleCandidateIds({ id: seekerId })).toEqual([seekerId]);

    expect(await revokeConsent({ userId, type: "BLIND_PROFILE" })).toBe(true);
    expect(await isEligibleCandidate(seekerId)).toBe(false);
    expect(await eligibleCandidateIds({ id: seekerId })).toEqual([]);

    const consent = await db.consent.findFirstOrThrow({
      where: { userId, type: "BLIND_PROFILE" },
    });
    expect(consent.revokedAt).not.toBeNull();
    const audit = await db.auditLog.findFirst({
      where: { action: "CONSENT_REVOKE", actorId: userId },
    });
    expect(audit).toMatchObject({ entity: "Consent", entityId: consent.id });
    expect(audit?.meta).toMatchObject({ type: "BLIND_PROFILE" });

    // giving it again brings the seeker back
    await grantConsent({ userId, type: "BLIND_PROFILE", locale: "ko", ip: null });
    expect(await isEligibleCandidate(seekerId)).toBe(true);
  });

  it("revoking twice is harmless; revoking MARKETING does not affect eligibility", async () => {
    const { userId, seekerId } = await gradeASeeker();
    expect(await revokeConsent({ userId, type: "MARKETING" })).toBe(true);
    expect(await revokeConsent({ userId, type: "MARKETING" })).toBe(false);
    expect(await isEligibleCandidate(seekerId)).toBe(true);
  });

  it("WO15-06 BR-07: an E-9 seeker (FUTURE_POOL) is never a candidate, even at grade A", async () => {
    const { seekerId } = await gradeASeeker("E-9");
    expect(await isEligibleCandidate(seekerId)).toBe(false);
  });

  it("BR-06: grade B, inactive or unfinished seekers are excluded", async () => {
    const { seekerId } = await gradeASeeker();
    await db.seekerProfile.update({ where: { id: seekerId }, data: { grade: "B" } });
    expect(await isEligibleCandidate(seekerId)).toBe(false);
    await db.seekerProfile.update({
      where: { id: seekerId },
      data: { grade: "S", status: "INACTIVE" },
    });
    expect(await isEligibleCandidate(seekerId)).toBe(false);
    await db.seekerProfile.update({
      where: { id: seekerId },
      data: { status: "ACTIVE", completedStep: 6 },
    });
    expect(await isEligibleCandidate(seekerId)).toBe(false);
  });

  it("Q-11 / P1c QA O-1: a seeker whose stay expiry month is over is excluded at once", async () => {
    const { seekerId } = await gradeASeeker();
    const now = new Date("2027-03-15T10:00:00.000Z");
    // valid until this month → still a candidate (a permit "until March" is not expired in March)
    await db.seekerProfile.update({
      where: { id: seekerId },
      data: { stayExpiry: new Date("2027-03-01T00:00:00.000Z") },
    });
    expect(await isEligibleCandidate(seekerId, now)).toBe(true);
    expect(await eligibleCandidateIds({ id: seekerId }, now)).toEqual([seekerId]);
    // changed to last month after registration (/me/stay) → excluded
    await db.seekerProfile.update({
      where: { id: seekerId },
      data: { stayExpiry: new Date("2027-02-01T00:00:00.000Z") },
    });
    expect(await isEligibleCandidate(seekerId, now)).toBe(false);
    expect(await eligibleCandidateIds({ id: seekerId }, now)).toEqual([]);
    // the same rule as classifyTrack's isStayExpired
    expect(eligibleCandidateWhere(now)).toMatchObject({
      OR: [{ stayExpiry: null }, { stayExpiry: { gte: notExpiredFrom(now) } }],
    });
    expect(isStayExpired(new Date("2027-02-01T00:00:00.000Z"), now)).toBe(true);
    expect(isStayExpired(notExpiredFrom(now), now)).toBe(false);
  });
});
