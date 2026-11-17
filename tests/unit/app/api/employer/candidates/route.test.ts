/**
 * R-205 / R-207 / SC-07: GET /api/employer/candidates — 404 while FEATURE_EMPLOYER_CANDIDATES is off
 * (even without a session), 401 without an employer session, the summary for companies without
 * list access, the list for verified + contracted companies, and 429 (+ Retry-After) on the view
 * after the daily cap, with the refusal logged (CANDIDATE_BULK_VIEW). The session is mocked.
 */
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CANDIDATE_VIEWS_PER_DAY } from "@/config/limits";
import { consumeCandidateView } from "@/lib/candidates/browse";
import { db } from "@/lib/db";
import type { EmployerActor } from "@/lib/employer/session";
import { AuthzError } from "@/lib/rbac";
import { toBlindPublicId } from "@/lib/serializers/blindSeeker";

import { candidate, company, tag } from "../../../../lib/candidates/candidateFixtures";

const session = vi.hoisted(() => ({ actor: null as EmployerActor | null }));
vi.mock("@/lib/employer/session", () => ({
  requireEmployer: vi.fn(async () => {
    if (!session.actor) throw new AuthzError("UNAUTHENTICATED", 401, "no session");
    return session.actor;
  }),
  currentEmployer: vi.fn(async () => session.actor),
}));

const { GET } = await import("@/app/api/employer/candidates/route");

afterAll(() => db.$disconnect());
beforeEach(() => {
  session.actor = null;
});
afterEach(() => {
  delete process.env.FEATURE_EMPLOYER_CANDIDATES;
});

const get = (q = "") => GET(new NextRequest(`http://127.0.0.1/api/employer/candidates${q}`));

describe("R-205 GET /api/employer/candidates", () => {
  it("SC-07: flag off → 404 with or without a session", async () => {
    expect((await get()).status).toBe(404);
    session.actor = await company({ verified: true, contracted: true });
    const res = await get();
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: "NOT_FOUND", message: "not found" } });
  });

  it("flag on: 401 without an employer session; STATS for a company without list access", async () => {
    process.env.FEATURE_EMPLOYER_CANDIDATES = "true";
    expect((await get()).status).toBe(401);
    session.actor = await company({ contracted: true });
    const res = await get();
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.access).toBe("STATS");
    expect(body).not.toHaveProperty("candidates");
  });

  it("R-207: the 101st view of the day answers 429 with Retry-After, and the refusal is logged", async () => {
    process.env.FEATURE_EMPLOYER_CANDIDATES = "true";
    const t = tag("route");
    const seeker = await candidate(t);
    const c = await company({ verified: true, contracted: true });
    session.actor = c;
    const first = await get(`?convertible=${t}`);
    expect(first.status).toBe(200);
    const body = (await first.json()) as { access: string; candidates: { publicId: string }[] };
    expect(body.access).toBe("LIST");
    expect(body.candidates.map((x) => x.publicId)).toEqual([toBlindPublicId(seeker.publicId)]);

    for (let i = 1; i < CANDIDATE_VIEWS_PER_DAY; i++) await consumeCandidateView(c.companyId);
    const refused = await get(`?convertible=${t}`);
    expect(refused.status).toBe(429);
    expect(Number(refused.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(await refused.json()).toMatchObject({ error: { code: "RATE_LIMITED" } });
    const logs = await db.auditLog.findMany({
      where: { action: "CANDIDATE_BULK_VIEW", entityId: c.companyId },
      orderBy: { at: "asc" },
    });
    expect(logs).toHaveLength(2);
    expect(logs[1].meta).toMatchObject({ refused: "DAILY_LIMIT" });
  });

  it("P2d 선행 A-5: filter codes outside the VisaType / Industry lists are ignored (200, not in the audit meta)", async () => {
    process.env.FEATURE_EMPLOYER_CANDIDATES = "true";
    const t = tag("route-odd");
    const seeker = await candidate(t);
    const c = await company({ verified: true, contracted: true });
    session.actor = c;
    // code-shaped values that the contact detector reads as messenger ids, and plain unknown codes
    for (const q of [
      `?convertible=${t}&visa=fb12345678&industry=kakao1234`,
      `?convertible=${t}&visa=ZZ-99&industry=NOT_AN_INDUSTRY`,
    ]) {
      const res = await get(q);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { candidates: { publicId: string }[] };
      expect(body.candidates.map((x) => x.publicId)).toEqual([toBlindPublicId(seeker.publicId)]);
    }
    const logs = await db.auditLog.findMany({
      where: { action: "CANDIDATE_BULK_VIEW", entityId: c.companyId },
    });
    expect(logs).toHaveLength(2);
    for (const l of logs)
      expect((l.meta as { filters: unknown }).filters).toEqual({ convertible: t });

    // a listed code is kept (F-4 is a seeded VisaType)
    const kept = await get(`?convertible=${t}&visa=F-4`);
    expect(kept.status).toBe(200);
    const last = await db.auditLog.findFirstOrThrow({
      where: { action: "CANDIDATE_BULK_VIEW", entityId: c.companyId },
      orderBy: { at: "desc" },
    });
    expect((last.meta as { filters: unknown }).filters).toEqual({ convertible: t, visa: "F-4" });
  });
});
