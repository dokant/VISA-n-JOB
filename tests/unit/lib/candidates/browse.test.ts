/**
 * R-205 / R-207 / PC-12: browseCandidates — only verified + contracted companies get rows, rows
 * only through blindSeeker.ts, every view counted against the daily cap (101st refused) and logged
 * as CANDIDATE_BULK_VIEW, the window is the Korean calendar day.
 */
import { afterAll, describe, expect, it } from "vitest";

import { CANDIDATE_VIEWS_PER_DAY } from "@/config/limits";
import { candidateAccessOf } from "@/lib/candidates/access";
import {
  browseCandidates,
  consumeCandidateView,
  groupApplySizes,
  kstDayStart,
} from "@/lib/candidates/browse";
import { db } from "@/lib/db";
import { BLIND_SEEKER_FIELDS, toBlindPublicId } from "@/lib/serializers/blindSeeker";
import { EMPTY_CANDIDATE_FILTERS } from "@/schemas/employer/candidates";

import { candidate, company, tag } from "./candidateFixtures";

afterAll(() => db.$disconnect());

const views = (companyId: string) =>
  db.auditLog.findMany({
    where: { action: "CANDIDATE_BULK_VIEW", entity: "Company", entityId: companyId },
    orderBy: { at: "asc" },
  });

describe("R-205 browseCandidates", () => {
  it("R-205 / R-218: only verified + contracted companies get the list (else NOT_CONTRACTED)", async () => {
    for (const opts of [{}, { verified: true }, { contracted: true }]) {
      const c = await company(opts);
      expect((await candidateAccessOf(c.companyId)).level).toBe("STATS");
      const r = await browseCandidates({ actor: c, filters: EMPTY_CANDIDATE_FILTERS });
      expect(r).toEqual({ ok: false, code: "NOT_CONTRACTED" });
      expect(await views(c.companyId)).toHaveLength(0);
    }
    const full = await company({ verified: true, contracted: true });
    expect(await candidateAccessOf(full.companyId)).toEqual({
      level: "LIST",
      verified: true,
      contracted: true,
    });
  });

  it("WO15-06 / BR-02: eligible rows only, WO §7.5 keys only, E-9 excluded; one audit row per view", async () => {
    const t = tag("browse");
    const a = await candidate(t);
    const s = await candidate(t, { grade: "S", verifiedKorean: true });
    const e9 = await candidate(t, { visaCode: "E-9", track: "FUTURE_POOL" });
    const c = await company({ verified: true, contracted: true });
    const r = await browseCandidates({
      actor: c,
      filters: { ...EMPTY_CANDIDATE_FILTERS, convertible: t },
    });
    if (!r.ok) throw new Error(r.code);
    // S first (우선 추천), then A
    expect(r.candidates.map((x) => x.publicId)).toEqual([
      toBlindPublicId(s.publicId),
      toBlindPublicId(a.publicId),
    ]);
    expect(r.candidates.map((x) => x.publicId)).not.toContain(toBlindPublicId(e9.publicId));
    for (const x of r.candidates) expect(Object.keys(x)).toEqual([...BLIND_SEEKER_FIELDS]);
    expect(r.remaining).toBe(CANDIDATE_VIEWS_PER_DAY - 1);

    const logs = await views(c.companyId);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ actorId: c.id });
    expect(logs[0].meta).toEqual({
      filters: { convertible: t },
      resultCount: 2,
      publicIds: r.candidates.map((x) => x.publicId),
    });
  });

  it("R-207: the 101st view of a day is refused (RATE_LIMITED) and logged; the next Korean day is new", async () => {
    const t = tag("cap");
    await candidate(t);
    const c = await company({ verified: true, contracted: true });
    const filters = { ...EMPTY_CANDIDATE_FILTERS, convertible: t };
    // 2031-05-20 10:00 KST
    const morning = new Date("2031-05-20T01:00:00.000Z");
    for (let i = 0; i < CANDIDATE_VIEWS_PER_DAY; i++) {
      const r = await browseCandidates({ actor: c, filters, now: morning });
      expect(r.ok).toBe(true);
    }
    // 23:30 KST the same day → still the same window
    const late = new Date("2031-05-20T14:30:00.000Z");
    const refused = await browseCandidates({ actor: c, filters, now: late });
    expect(refused).toEqual({ ok: false, code: "RATE_LIMITED", retryAfterSec: 30 * 60 });

    const logs = await views(c.companyId);
    expect(logs).toHaveLength(CANDIDATE_VIEWS_PER_DAY + 1);
    expect(logs.at(-1)?.meta).toMatchObject({
      refused: "DAILY_LIMIT",
      limit: CANDIDATE_VIEWS_PER_DAY,
    });

    // 00:05 KST the next day → a new window
    const nextDay = new Date("2031-05-20T15:05:00.000Z");
    const again = await browseCandidates({ actor: c, filters, now: nextDay });
    expect(again).toMatchObject({ ok: true, remaining: CANDIDATE_VIEWS_PER_DAY - 1 });
  });

  it("kstDayStart / consumeCandidateView: the day boundary is midnight in Korea", async () => {
    expect(kstDayStart(new Date("2031-05-20T14:59:59.000Z")).toISOString()).toBe(
      "2031-05-19T15:00:00.000Z",
    );
    expect(kstDayStart(new Date("2031-05-20T15:00:00.000Z")).toISOString()).toBe(
      "2031-05-20T15:00:00.000Z",
    );
    const c = await company({ verified: true, contracted: true });
    const r = await consumeCandidateView(c.companyId, new Date("2031-05-20T14:59:59.000Z"));
    expect(r).toEqual({ ok: true, remaining: CANDIDATE_VIEWS_PER_DAY - 1 });
  });

  it("groupApplySize: friends linked by the friend code count together (WO §7.5)", async () => {
    const t = tag("group");
    const leader = await candidate(t, { groupApply: true });
    const friend = await candidate(t, { groupApply: true, groupFriendCode: leader.referralCode });
    const alone = await candidate(t, { groupApply: true });
    const no = await candidate(t, { groupApply: false });
    const rows = await db.seekerProfile.findMany({
      where: { id: { in: [leader.id, friend.id, alone.id, no.id] } },
      select: { id: true, groupApply: true, groupFriendCode: true, referralCode: true },
    });
    const sizes = await groupApplySizes(rows);
    expect(sizes.get(leader.id)).toBe(2);
    expect(sizes.get(friend.id)).toBe(2);
    expect(sizes.has(alone.id)).toBe(false);
    expect(sizes.has(no.id)).toBe(false);

    const c = await company({ verified: true, contracted: true });
    const r = await browseCandidates({
      actor: c,
      filters: { ...EMPTY_CANDIDATE_FILTERS, convertible: t },
    });
    if (!r.ok) throw new Error(r.code);
    const byId = new Map(r.candidates.map((x) => [x.publicId, x.groupApplySize]));
    expect(byId.get(toBlindPublicId(leader.publicId))).toBe(2);
    expect(byId.get(toBlindPublicId(no.publicId))).toBeNull();
  });
});
