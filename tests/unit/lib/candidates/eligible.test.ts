/**
 * R-113 / WO15-08: BLIND_PROFILE 철회 즉시 기업 후보 쿼리에서 제외. Also BR-06 / BR-07 query rules
 * (S·A, JOB_MATCH, ACTIVE, finished) and the CONSENT_REVOKE audit row (BR-15).
 */
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  candidateFilterWhere,
  eligibleCandidateIds,
  eligibleCandidateWhere,
  isEligibleCandidate,
} from "@/lib/candidates/eligible";
import { grantConsent, revokeConsent } from "@/lib/seeker/consent";
import { isStayExpired, notExpiredFrom } from "@/lib/visa-engine/classifyTrack";
import {
  type CandidateFilters,
  EMPTY_CANDIDATE_FILTERS,
  parseCandidateFilters,
} from "@/schemas/employer/candidates";

import { fillSteps, save, wizardAccount } from "../seeker/seekerFixtures";
import { candidate, tag } from "./candidateFixtures";

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

describe("R-205 candidate query (P2b): active job search and the 8 filters", () => {
  const ids = async (t: string, filters: Partial<CandidateFilters> = {}, now = new Date()) =>
    (
      await db.seekerProfile.findMany({
        where: {
          AND: [
            eligibleCandidateWhere(now),
            candidateFilterWhere({ ...EMPTY_CANDIDATE_FILTERS, convertible: t, ...filters }, now),
          ],
        },
        select: { id: true },
      })
    )
      .map((r) => r.id)
      .sort();

  it("BR-06: NOT_SEARCHING or an unanswered job search status is not shown", async () => {
    const t = tag("jss");
    const active = await candidate(t, { jobSearchStatus: "EMPLOYED_OPEN" });
    await candidate(t, { jobSearchStatus: "NOT_SEARCHING" });
    await candidate(t, { jobSearchStatus: null });
    expect(await ids(t)).toEqual([active.id]);
  });

  it("WO15-06: E-9 (FUTURE_POOL), grade B and revoked BLIND_PROFILE never pass, whatever the filter", async () => {
    const t = tag("excl");
    const ok = await candidate(t);
    await candidate(t, { visaCode: "E-9", track: "FUTURE_POOL" });
    await candidate(t, { grade: "B" });
    await candidate(t, { blindProfile: "REVOKED" });
    await candidate(t, { blindProfile: "NONE" });
    expect(await ids(t)).toEqual([ok.id]);
    expect(await ids(t, { visa: "E-9" })).toEqual([]);
  });

  it("R-205: each of the 8 filters narrows the list (WO §9.3)", async () => {
    const now = new Date("2030-06-10T03:00:00.000Z");
    const t = tag("flt");
    const industries = await db.industry.findMany({ take: 2, orderBy: { code: "asc" } });
    const base = await candidate(t, {
      visaCode: "F-4",
      stayExpiry: new Date(Date.UTC(2031, 2, 1)), // 9 months → M6_12
      topikLevel: 2,
      skills: ["FORKLIFT"],
      needDormitory: false,
      shiftOk: "NO",
    });
    const other = await candidate(t, {
      visaCode: "H-2",
      stayExpiry: new Date(Date.UTC(2033, 0, 1)), // 31 months → M24_PLUS
      topikLevel: 5,
      skills: ["WELDING"],
      needDormitory: true,
      shiftOk: "YES",
    });
    await db.workExperience.updateMany({
      where: { seekerId: other.id },
      data: { industryCode: industries[1].code },
    });
    await db.workExperience.updateMany({
      where: { seekerId: base.id },
      data: { industryCode: industries[0].code },
    });
    const both = [base.id, other.id].sort();
    expect(await ids(t, {}, now)).toEqual(both);
    expect(await ids(t, { visa: "H-2" }, now)).toEqual([other.id]);
    expect(await ids(t, { stay: "M6_12" }, now)).toEqual([base.id]);
    expect(await ids(t, { stay: "M24_PLUS" }, now)).toEqual([other.id]);
    expect(await ids(t, { topik: "3" }, now)).toEqual([other.id]);
    expect(await ids(t, { industry: industries[0].code }, now)).toEqual([base.id]);
    expect(await ids(t, { skill: "WELDING" }, now)).toEqual([other.id]);
    expect(await ids(t, { dormitory: "NO" }, now)).toEqual([base.id]);
    expect(await ids(t, { shift: "YES" }, now)).toEqual([other.id]);
    expect(await ids(t, { convertible: tag("none") }, now)).toEqual([]);
  });

  it("filters from a query string: unknown values are dropped, not errors", () => {
    const f = parseCandidateFilters(
      new URLSearchParams("visa=F-4&stay=M6_12&topik=9&skill=HACKING&dormitory=YES&shift=UNKNOWN"),
    );
    expect(f).toEqual({
      ...EMPTY_CANDIDATE_FILTERS,
      visa: "F-4",
      stay: "M6_12",
      dormitory: "YES",
    });
    expect(parseCandidateFilters({ visa: ["E-7", "F-4"], industry: "<script>" })).toMatchObject({
      visa: "E-7",
      industry: "",
    });
  });
});
