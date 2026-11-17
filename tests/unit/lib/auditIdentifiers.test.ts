/**
 * P2c QA run 2 F-1: database ids in audit meta are not contacts.
 * A cuid such as "cmwj193vm000a6mewt3fb51zr" reads as a messenger id ("fb" + digits) to the contact
 * detector, which made 추천 실행 and 동의 철회 fail for about 0.1 % of ids. `assertSafeMeta` now skips
 * the contact check only for a value under an id key (`id`, `…Id`, `…Ids`, `verifiedBy`) that is
 * exactly a cuid or uuid; every other string is still checked.
 */
import { randomInt, randomUUID } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import { listAdminCompanies, setCompanyVerified } from "@/lib/admin/companies";
import { AuditInputError, assertSafeMeta, isIdentifierValue, writeAudit } from "@/lib/audit";
import { agreeInterviewConsent, revokeInterviewConsent } from "@/lib/consent/thirdParty";
import { db } from "@/lib/db";
import { loadEmployerRequests } from "@/lib/employer/interviews";
import { detectContacts, hasContacts } from "@/lib/pii-guard";
import { recommendForInterest, recommendForPosting } from "@/lib/recommendations/matching";
import { recordInterviewResult } from "@/lib/recommendations/interviews";

import { uniq } from "../db/helpers";
import { auditRows } from "./admin/adminFixtures";
import { LEAK_NAME } from "./candidates/candidateFixtures";
import { matchSeeker, matchSetup } from "./recommendations/matchingFixtures";

afterAll(() => db.$disconnect());

const BASE36 = "0123456789abcdefghijklmnopqrstuvwxyz";
const LETTERS = "abcdefghijklmnopqrstuvwxyz";
const pick = (alphabet: string, n: number) =>
  Array.from({ length: n }, () => alphabet[randomInt(alphabet.length)]).join("");

/** cuid v1 layout: "c" + timestamp(8) + counter(4) + fingerprint(4) + random(8), base36. */
function randomCuid(): string {
  const ts = (Date.now() - randomInt(0, 2 ** 40)).toString(36).padStart(8, "0").slice(-8);
  return `c${ts}${pick(BASE36, 4)}${pick(BASE36, 4)}${pick(BASE36, 8)}`;
}

/**
 * A fresh (unique) cuid-format id ending in `tail`. With `mustDetect`, the prefix is retried until
 * the contact detector really flags the whole id, so the test proves the false-positive case.
 */
function contactLikeCuid(tail: string, mustDetect = true): string {
  for (let i = 0; i < 200; i++) {
    const id = `c${pick(LETTERS, 1)}${pick(BASE36, 23 - tail.length)}${tail}`;
    if (id.length !== 25) throw new Error("tail too long");
    if (!mustDetect || hasContacts(id)) return id;
  }
  throw new Error(`no contact-like cuid for ${tail}`);
}

/** Tails that the detector reads as contacts inside a cuid (seen in the dev DB, QA run 2 F-1). */
const DETECTED_TAILS = [
  "3fb51zr",
  "6fb00096mac00dcf12p",
  "7fb00ri6mh8",
  "wechat123400q",
  "01012345678",
];
/** Other contact-looking fragments (not necessarily flagged on their own). */
const OTHER_TAILS = ["ig1234", "atgmailcom", "82101234567", "kakao1234"];

describe("F-1 audit meta identifiers", () => {
  it("the contact-like ids used below are flagged by the detector (the case being fixed)", () => {
    for (const tail of DETECTED_TAILS) {
      const id = contactLikeCuid(tail);
      expect(isIdentifierValue(id)).toBe(true);
      expect(detectContacts(id).length).toBeGreaterThan(0);
    }
    // the exact ids from the dev DB report
    for (const id of [
      "cmwj193vm000a6mewt3fb51zr",
      "cmwjvn6fb00096mac00dcf12p",
      "cmwkfhdue000f6mekb7fb506i",
      "cmwk437fb00ri6mh8j1nkpmt8",
    ]) {
      expect(hasContacts(id)).toBe(true);
      expect(() => assertSafeMeta({ seekerId: id, companyIds: [id], id })).not.toThrow();
    }
  });

  it("id keys with cuid / uuid values pass; the same values under other keys, and contacts under id keys, are refused", () => {
    const ids = [...DETECTED_TAILS, ...OTHER_TAILS].map((t) => contactLikeCuid(t, false));
    const meta = {
      seekerId: ids[0],
      companyId: ids[1],
      postingId: ids[2],
      interestRequestId: ids[3],
      interviewId: ids[4],
      id: ids[5],
      verifiedBy: ids[6],
      companyIds: ids,
      publicIds: [randomUUID(), randomUUID()],
      nested: { leadId: ids[7] },
    };
    expect(() => assertSafeMeta(meta)).not.toThrow();

    // a detected id under a non-id key is still checked
    const detected = contactLikeCuid("3fb51zr");
    expect(() => assertSafeMeta({ note: detected })).toThrow(AuditInputError);
    expect(() => assertSafeMeta({ reason: [detected] })).toThrow(/meta\.reason\[0\]/);
    // real contacts under an id key are refused (the value is not a cuid / uuid)
    for (const contact of [
      "010-1234-5678",
      "hong@example.com",
      "kakao: hong1234",
      "+84 912 345 678",
      `${detected} 010-1234-5678`,
      `${detected}@example.com`,
    ]) {
      expect(() => assertSafeMeta({ seekerId: contact })).toThrow(AuditInputError);
      expect(() => assertSafeMeta({ companyIds: ["ok", contact] })).toThrow(AuditInputError);
    }
    // ordinary meta text with a contact is refused as before
    expect(() => assertSafeMeta({ note: "전화 010-1234-5678" })).toThrow(AuditInputError);
    // secret keys are refused whatever the value
    expect(() => assertSafeMeta({ phoneEnc: detected })).toThrow(/must not be logged/);
  });

  it("100,000 random cuids all pass assertSafeMeta under an id key", () => {
    let flaggedWithoutRule = 0;
    let failures = 0;
    for (let i = 0; i < 100_000; i++) {
      const id = randomCuid();
      if (hasContacts(id)) flaggedWithoutRule += 1;
      try {
        assertSafeMeta({ seekerId: id, companyIds: [id] });
      } catch {
        failures += 1;
      }
    }
    expect(failures).toBe(0);
    // the rule matters: some random cuids are read as contacts by the detector itself
    expect(flaggedWithoutRule).toBeGreaterThan(0);
  }, 120_000);
});

describe("F-1 flows with contact-like ids (추천 · 면접 · 동의 철회 · 기업 검증)", () => {
  async function contactLikeCompany(setup: Awaited<ReturnType<typeof matchSetup>>) {
    const companyId = contactLikeCuid("3fb51zr");
    const industry = await db.industry.findFirstOrThrow({ select: { code: true } });
    await db.company.create({
      data: {
        id: companyId,
        nameEnc: "F-1 테스트 기업",
        industryCode: industry.code,
        sido: "SEOUL",
        verified: true,
        verifiedAt: new Date(),
        contractSignedAt: new Date(),
        contractVersion: "v1",
      },
    });
    const employer = await db.user.create({
      data: { role: "EMPLOYER", email: `${uniq("f1-employer")}@example.test`, companyId },
      select: { id: true },
    });
    const now = new Date();
    const posting = await db.jobPosting.create({
      data: {
        id: contactLikeCuid("7fb00ri6mh8"),
        companyId,
        leadId: setup.posting.leadId,
        blindTitle: `F-1 공고 ${uniq("t")}`,
        industryCode: "C",
        sido: "SEOUL",
        role: "생산직",
        payMin: 2_500_000,
        dormitory: "NONE",
        headcount: 1,
        eligibleVisas: [setup.visa],
        status: "PUBLISHED",
        verifiedBy: "staff-test",
        verifiedAt: now,
        publishedAt: now,
      },
    });
    return { companyId, employerId: employer.id, postingId: posting.id };
  }

  it("추천 실행 (posting and interest request), interview disclosure, revoke and company verify all write their audit rows", async () => {
    const setup = await matchSetup("F1");
    const co = await contactLikeCompany(setup);
    const seeker = await matchSeeker(setup, { id: contactLikeCuid("6fb00096mac00dcf12p") });
    const seeker2 = await matchSeeker(setup, { id: contactLikeCuid("wechat123400q") });

    // 추천 실행 from the posting
    const rec = await recommendForPosting({
      staffId: setup.staff.id,
      postingId: co.postingId,
      seekerId: seeker.id,
    });
    expect(rec.ok && !rec.already).toBe(true);
    if (!rec.ok) return;
    const recAudit = await auditRows(rec.recommendation.id, "RECOMMENDATION_CREATE");
    expect(recAudit).toHaveLength(1);
    expect(recAudit[0].meta).toMatchObject({
      seekerId: seeker.id,
      companyId: co.companyId,
      postingId: co.postingId,
    });

    // 추천 실행 from an interest request with a contact-like id
    const interest = await db.interestRequest.create({
      data: {
        id: contactLikeCuid("01012345678"),
        initiator: "SEEKER",
        seekerId: seeker2.id,
        postingId: co.postingId,
      },
    });
    const rec2 = await recommendForInterest({
      staffId: setup.staff.id,
      interestRequestId: interest.id,
    });
    expect(rec2.ok).toBe(true);
    if (!rec2.ok) return;
    expect(await auditRows(rec2.recommendation.id, "RECOMMENDATION_CREATE")).toHaveLength(1);

    // 면접 (contact-like interview id): consent → the company sees the name (PII_VIEW with companyId)
    const interview = await db.interview.create({
      data: {
        id: contactLikeCuid("3fb51zr"),
        recommendationId: rec.recommendation.id,
        scheduledAt: new Date(Date.now() + 3 * 86_400_000),
        place: "본사 2층 회의실",
        status: "CONFIRMED",
        confirmedAt: new Date(),
      },
    });
    expect(
      await agreeInterviewConsent({
        userId: seeker.userId,
        interviewId: interview.id,
        locale: "ko",
        ip: null,
      }),
    ).toEqual({ ok: true, changed: true });
    const actor = { id: co.employerId, companyId: co.companyId };
    expect(JSON.stringify(await loadEmployerRequests(actor))).toContain(LEAK_NAME);
    const views = await auditRows(interview.id, "PII_VIEW");
    expect(views.length).toBeGreaterThan(0);
    expect(views.at(-1)?.meta).toMatchObject({ companyId: co.companyId });

    // 동의 철회 succeeds, the consent is revoked and CONSENT_REVOKE is written
    expect(
      await revokeInterviewConsent({ userId: seeker.userId, interviewId: interview.id }),
    ).toEqual({ ok: true, changed: true });
    const active = await db.consent.count({
      where: { userId: seeker.userId, interviewId: interview.id, revokedAt: null },
    });
    expect(active).toBe(0);
    const revoke = await db.auditLog.findMany({
      where: { action: "CONSENT_REVOKE", actorId: seeker.userId },
    });
    expect(
      revoke.some((r) => (r.meta as { interviewId?: string }).interviewId === interview.id),
    ).toBe(true);
    expect(JSON.stringify(await loadEmployerRequests(actor))).not.toContain(LEAK_NAME);

    // the result can be recorded on it
    await recordInterviewResult({ interviewId: interview.id, attended: true, result: "HIRED" });

    // 기업 검증 (contact-like company id) and the company list audit with company ids
    expect(
      await setCompanyVerified({
        actorId: setup.staff.id,
        companyId: co.companyId,
        verified: false,
      }),
    ).toEqual({ ok: true });
    expect(await auditRows(co.companyId, "COMPANY_VERIFY")).toHaveLength(1);
    await expect(listAdminCompanies(setup.staff.id)).resolves.toBeDefined();
  });

  it("writeAudit still refuses a contact in ordinary meta text", async () => {
    const entityId = uniq("f1-bad");
    await expect(
      writeAudit(
        {
          actorId: "a",
          action: "RECOMMENDATION_CREATE",
          entity: "Recommendation",
          entityId,
          meta: { seekerId: contactLikeCuid("3fb51zr"), note: "zalo 0912345678" },
        },
        db,
      ),
    ).rejects.toThrow(AuditInputError);
    expect(await auditRows(entityId)).toHaveLength(0);
  });
});
