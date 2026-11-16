/**
 * R-202 / R-015 / SC-07: GET /api/jobs and /api/jobs/[id] — 404 while FEATURE_PUBLIC_JOBS is off;
 * when on, only public postings (WO §15-3: no C·B lead) with the WO §8.5 keys only.
 */
import { NextRequest } from "next/server";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { GET as getOne } from "@/app/api/jobs/[id]/route";
import { GET as getList } from "@/app/api/jobs/route";
import { db } from "@/lib/db";
import { BLIND_JOB_FIELDS } from "@/lib/serializers/publicPosting";

import { COMPANY_NAME, rawPosting } from "../../../lib/postings/postingFixtures";

afterAll(() => db.$disconnect());
afterEach(() => {
  delete process.env.FEATURE_PUBLIC_JOBS;
});

function one(id: string) {
  return getOne(new NextRequest(`http://127.0.0.1/api/jobs/${id}`), {
    params: Promise.resolve({ id }),
  });
}

describe("R-202 /api/jobs", () => {
  it("R-015 / SC-07: flag off (default) → 404 for list and detail", async () => {
    const { posting } = await rawPosting("A");
    expect((await getList()).status).toBe(404);
    expect((await one(posting.id)).status).toBe(404);
  });

  it("WO15-03 / R-202: flag on → grade-A postings only, WO §8.5 keys only, no company data", async () => {
    process.env.FEATURE_PUBLIC_JOBS = "true";
    const a = await rawPosting("A");
    const b = await rawPosting("B");
    const c = await rawPosting("C");
    const res = await getList();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { postings: Array<Record<string, unknown>> };
    const ids = body.postings.map((p) => p.id);
    expect(ids).toContain(a.posting.id);
    expect(ids).not.toContain(b.posting.id);
    expect(ids).not.toContain(c.posting.id);
    for (const p of body.postings) {
      expect(Object.keys(p).sort()).toEqual([...BLIND_JOB_FIELDS].sort());
    }
    const text = JSON.stringify(body);
    expect(text).not.toContain(COMPANY_NAME);
    expect(text).not.toMatch(/companyId|leadId|verifiedBy|bizRegNo|contact/);

    expect((await one(a.posting.id)).status).toBe(200);
    expect((await one(b.posting.id)).status).toBe(404);
    expect((await one(c.posting.id)).status).toBe(404);
  });
});
