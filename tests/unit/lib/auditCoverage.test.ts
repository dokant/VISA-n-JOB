/**
 * N-05 묶음 (P2e 작업 2, BR-15, STANDARD 4.8): each of the five audited operations — PII 열람,
 * 내보내기(PC-14: 감사 액션 상수·함수 단위), 등급 변경, 추천, 공고 공개 — writes exactly one AuditLog
 * row through its real entry point, with the acting staff id and no plaintext personal data in
 * `meta`. A refused operation writes none. The test DB is shared and never cleaned: unique rows only.
 */
import { afterAll, describe, expect, it } from "vitest";

import { AUDIT_ACTIONS, AuditAction, auditPiiExport } from "@/lib/audit";
import { changeSeekerGrade, revealSeekerPii } from "@/lib/admin/seekerReview";
import { db } from "@/lib/db";
import { createPostingFromLead, publishPosting, verifyPosting } from "@/lib/postings/manage";
import { createRecommendation } from "@/lib/recommendations/ledger";

import { uniq } from "../db/helpers";
import { auditRows, seeker, staffUser } from "./admin/adminFixtures";
import { gradedLead, postingInput } from "./postings/postingFixtures";
import { matchSeeker, matchSetup } from "./recommendations/matchingFixtures";

afterAll(() => db.$disconnect());

const SECRET_NAME = "AUDIT COVERAGE REALNAME";

/** No decrypted value, phone or e-mail in any meta string. */
function expectNoPii(meta: unknown) {
  const text = JSON.stringify(meta ?? {});
  expect(text).not.toContain(SECRET_NAME);
  expect(text).not.toMatch(/\+?82-?10|010-?\d{4}|@[a-z0-9.-]+\.[a-z]+/i);
}

describe("N-05 audit coverage of the five BR-15 operations", () => {
  it("N-05: the five operations have their own action constants (STANDARD 4.8)", () => {
    for (const action of [
      "PII_VIEW",
      "PII_EXPORT",
      "SEEKER_GRADE_CHANGE",
      "RECOMMENDATION_CREATE",
      "POSTING_PUBLISH",
    ] as const) {
      expect(AUDIT_ACTIONS).toContain(action);
      expect(AuditAction[action]).toBe(action);
    }
  });

  it("N-05 PII 열람: revealSeekerPii writes PII_VIEW (field names only) before returning values", async () => {
    const staff = await staffUser("STAFF_VISA");
    const s = await seeker(uniq("audit-pii"), { legalNameEnc: SECRET_NAME });
    const values = await revealSeekerPii({ actorId: staff.id, seekerId: s.id, group: "basic" });
    expect(values).toMatchObject({ group: "basic", legalName: SECRET_NAME });
    const rows = await auditRows(s.id, "PII_VIEW");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ actorId: staff.id, entity: "SeekerProfile" });
    expect((rows[0].meta as { fields: string[] }).fields).toContain("legalNameEnc");
    expectNoPii(rows[0].meta);
  });

  it("N-05 내보내기 (PC-14): auditPiiExport writes PII_EXPORT with the batch id, count and field names", async () => {
    const staff = await staffUser("ADMIN");
    const batchId = uniq("export-batch");
    await auditPiiExport({
      actorId: staff.id,
      entity: "SeekerProfile",
      batchId,
      rowCount: 3,
      fields: ["legalNameEnc", "phoneEnc"],
    });
    const rows = await auditRows(batchId, "PII_EXPORT");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ actorId: staff.id, entity: "SeekerProfile" });
    expect(rows[0].meta).toEqual({ rowCount: 3, fields: ["legalNameEnc", "phoneEnc"] });
  });

  it("N-05 등급 변경: changeSeekerGrade B→A writes SEEKER_GRADE_CHANGE; a refused change writes none", async () => {
    const staff = await staffUser("STAFF_VISA");
    const unmet = await seeker(uniq("audit-grade"), { legalNameEnc: SECRET_NAME });
    const refused = await changeSeekerGrade({ actorId: staff.id, seekerId: unmet.id, to: "A" });
    expect(refused).toMatchObject({ ok: false, code: "REQUIREMENTS_UNMET" });
    expect(await auditRows(unmet.id, "SEEKER_GRADE_CHANGE")).toHaveLength(0);

    const ready = await seeker(uniq("audit-grade"), {
      legalNameEnc: SECRET_NAME,
      consultedAt: new Date(),
      verifiedVisa: true,
    });
    expect(await changeSeekerGrade({ actorId: staff.id, seekerId: ready.id, to: "A" })).toEqual({
      ok: true,
    });
    const rows = await auditRows(ready.id, "SEEKER_GRADE_CHANGE");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ actorId: staff.id, entity: "SeekerProfile" });
    expect(rows[0].meta).toEqual({ from: "B", to: "A" });
  });

  it("N-05 추천: createRecommendation writes RECOMMENDATION_CREATE in the same transaction; a repeat writes none", async () => {
    const setup = await matchSetup("AUD");
    const s = await matchSeeker(setup, { legalNameEnc: SECRET_NAME });
    const input = {
      seekerId: s.id,
      companyId: setup.employer.companyId,
      postingId: setup.posting.id,
      staffId: setup.staff.id,
      note: null,
    };
    const first = await createRecommendation(input);
    expect(first.already).toBe(false);
    const rows = await auditRows(first.recommendation.id, "RECOMMENDATION_CREATE");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ actorId: setup.staff.id, entity: "Recommendation" });
    expectNoPii(rows[0].meta);

    const again = await createRecommendation(input);
    expect(again).toMatchObject({ already: true });
    expect(again.recommendation.id).toBe(first.recommendation.id);
    expect(await auditRows(first.recommendation.id, "RECOMMENDATION_CREATE")).toHaveLength(1);
  });

  it("N-05 공고 공개: publishPosting writes POSTING_PUBLISH by the publisher; unverified publish writes none", async () => {
    const placement = await staffUser("STAFF_PLACEMENT");
    const lead = await gradedLead("A");
    const created = await createPostingFromLead({
      actorId: placement.id,
      input: postingInput(lead.id),
    });
    if (!created.ok) throw new Error(created.code);
    const postingId = created.postingId;
    expect(await publishPosting({ actorId: placement.id, postingId })).toMatchObject({
      ok: false,
      code: "NOT_VERIFIED",
    });
    expect(await auditRows(postingId, "POSTING_PUBLISH")).toHaveLength(0);

    expect(await verifyPosting({ actorId: placement.id, postingId })).toEqual({ ok: true });
    const publisher = await staffUser("ADMIN");
    expect(await publishPosting({ actorId: publisher.id, postingId })).toEqual({ ok: true });
    const rows = await auditRows(postingId, "POSTING_PUBLISH");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ actorId: publisher.id, entity: "JobPosting" });
    expectNoPii(rows[0].meta);
  });
});
