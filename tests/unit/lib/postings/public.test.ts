/**
 * R-202 (PRD): "C·B 리드 노출 0 (WO §15-3), 응답에 금지 필드 없음 테스트".
 * The public query returns PUBLISHED + verified postings of grade-A leads only, serialized by
 * publicPosting.ts.
 */
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { getPublicPosting, listPublicPostings } from "@/lib/postings/public";
import { BLIND_JOB_FIELDS } from "@/lib/serializers/publicPosting";

import { COMPANY_NAME, rawPosting } from "./postingFixtures";

afterAll(() => db.$disconnect());

async function publicIds(): Promise<Set<string>> {
  return new Set((await listPublicPostings(db, 10_000)).map((p) => p.id));
}

describe("R-202 public postings", () => {
  it("WO15-03: postings whose lead is C or B are never listed, even when stored as PUBLISHED", async () => {
    const c = await rawPosting("C");
    const b = await rawPosting("B");
    const a = await rawPosting("A");
    const ids = await publicIds();
    expect(ids.has(c.posting.id)).toBe(false);
    expect(ids.has(b.posting.id)).toBe(false);
    expect(ids.has(a.posting.id)).toBe(true);
    expect(await getPublicPosting(c.posting.id)).toBeNull();
    expect(await getPublicPosting(b.posting.id)).toBeNull();
  });

  it("WO15-03: a lead that later moved to 보관 / 재접촉금지 hides its posting", async () => {
    for (const grade of ["ARCHIVED", "DO_NOT_CONTACT"] as const) {
      const { posting } = await rawPosting(grade);
      expect(await getPublicPosting(posting.id)).toBeNull();
    }
  });

  it("WO15-04 / WO §8.5: DRAFT, CLOSED and unverified postings are not public", async () => {
    const draft = await rawPosting("A", { status: "DRAFT", publishedAt: null });
    const closed = await rawPosting("A", { status: "CLOSED", closedAt: new Date() });
    const unverified = await rawPosting("A", {
      status: "DRAFT",
      verifiedAt: null,
      verifiedBy: null,
      publishedAt: null,
    });
    const ids = await publicIds();
    for (const p of [draft, closed, unverified]) expect(ids.has(p.posting.id)).toBe(false);
  });

  it("R-202 / BR-03: every public posting has only the WO §8.5 keys and no company data", async () => {
    await rawPosting("A");
    const list = await listPublicPostings(db, 10_000);
    expect(list.length).toBeGreaterThan(0);
    for (const p of list) {
      expect(Object.keys(p).sort()).toEqual([...BLIND_JOB_FIELDS].sort());
      expect(JSON.stringify(p)).not.toContain(COMPANY_NAME);
      expect(p.verified).toBe(true);
    }
  });
});
