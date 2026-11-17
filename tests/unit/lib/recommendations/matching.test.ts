/**
 * R-209 매칭: 공고별 적합 구직자 = eligibleCandidateWhere (BR-06, BR-07, BLIND_PROFILE) + 공고 조건
 * (비자 eligibleVisas 항상, 지역·업종은 strict에서), 추천 실행은 같은 조건을 서버에서 다시 확인한다.
 * Also the interview steps that lead to the per-interview consent (면접 확정 → SMS 요청).
 */
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import type { NotificationMessage, NotificationProvider } from "@/lib/notifications";
import {
  cancelInterview,
  confirmInterview,
  createInterview,
  INTERVIEW_CONSENT_TEMPLATE,
} from "@/lib/recommendations/interviews";
import {
  listOpenInterestRequests,
  matchCandidates,
  recommendForInterest,
  recommendForPosting,
} from "@/lib/recommendations/matching";

import { matchSeeker, matchSetup } from "./matchingFixtures";

afterAll(() => db.$disconnect());

describe("R-209 matching", () => {
  it("R-209: only eligible seekers holding a posting visa; strict adds region and industry", async () => {
    const setup = await matchSetup("M1");
    const best = await matchSeeker(setup, { grade: "S" });
    const anyRegion = await matchSeeker(setup, { desiredRegions: ["ANY"], desiredIndustries: [] });
    const otherRegion = await matchSeeker(setup, { desiredRegions: ["BUSAN"] });
    const otherIndustry = await matchSeeker(setup, { desiredIndustries: ["Z"] });
    const gradeB = await matchSeeker(setup, { grade: "B" });
    const futurePool = await matchSeeker(setup, { track: "FUTURE_POOL" });
    const revoked = await matchSeeker(setup, { blindProfile: "REVOKED" });
    const otherVisa = await matchSeeker({ visa: `${setup.visa}-X` });

    const strict = await matchCandidates(setup.posting, "strict");
    const strictIds = strict.map((c) => c.id);
    expect(strictIds[0]).toBe(best.id); // S first among equal matches
    expect(new Set(strictIds)).toEqual(new Set([best.id, anyRegion.id]));

    const wide = (await matchCandidates(setup.posting, "visa")).map((c) => c.id);
    expect(new Set(wide)).toEqual(
      new Set([best.id, anyRegion.id, otherRegion.id, otherIndustry.id]),
    );
    for (const never of [gradeB, futurePool, revoked, otherVisa]) {
      expect(wide).not.toContain(never.id);
    }
    // nothing personal is selected for the staff list
    const text = JSON.stringify(strict);
    expect(text).not.toMatch(/legalName|phone|email|messenger/i);
  });

  it("R-209: 추천 실행 re-checks eligibility on the server and marks the 면접 신청 RECOMMENDED", async () => {
    const setup = await matchSetup("M2");
    const s = await matchSeeker(setup);
    const interest = await db.interestRequest.create({
      data: { initiator: "SEEKER", seekerId: s.id, postingId: setup.posting.id },
    });
    const ok = await recommendForPosting({
      staffId: setup.staff.id,
      postingId: setup.posting.id,
      seekerId: s.id,
    });
    expect(ok.ok && ok.already).toBe(false);
    expect(
      (await db.interestRequest.findUniqueOrThrow({ where: { id: interest.id } })).status,
    ).toBe("RECOMMENDED");

    const b = await matchSeeker(setup, { grade: "B" });
    expect(
      await recommendForPosting({
        staffId: setup.staff.id,
        postingId: setup.posting.id,
        seekerId: b.id,
      }),
    ).toEqual({ ok: false, code: "NOT_ELIGIBLE" });
    expect(
      await recommendForPosting({
        staffId: setup.staff.id,
        postingId: setup.posting.id,
        seekerId: s.id,
        note: "연락 010-1234-5678",
      }),
    ).toEqual({ ok: false, code: "NOTE_HAS_CONTACT" });
    const draft = await db.jobPosting.update({
      where: { id: setup.posting.id },
      data: { status: "CLOSED" },
    });
    expect(
      await recommendForPosting({ staffId: setup.staff.id, postingId: draft.id, seekerId: s.id }),
    ).toEqual({ ok: false, code: "POSTING_NOT_FOUND" });
    expect(await db.recommendation.count({ where: { seekerId: b.id } })).toBe(0);
  });

  it("R-209 / R-217 path: 기업 면접 요청 → 추천 실행 (to the requesting company)", async () => {
    const setup = await matchSetup("M3");
    const s = await matchSeeker(setup);
    const request = await db.interestRequest.create({
      data: { initiator: "EMPLOYER", seekerId: s.id, companyId: setup.employer.companyId },
    });
    // Newest first (P2c QA O-4): the request just made is on page 1 whatever the backlog.
    const open = await listOpenInterestRequests();
    expect(open.total).toBeGreaterThanOrEqual(1);
    const row = open.rows.find((r) => r.id === request.id);
    expect(row?.eligible).toBe(true);
    expect(row?.targetCompanyId).toBe(setup.employer.companyId);

    const r = await recommendForInterest({
      staffId: setup.staff.id,
      interestRequestId: request.id,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.recommendation.companyId).toBe(setup.employer.companyId);
    expect(r.recommendation.postingId).toBeNull();
    expect((await listOpenInterestRequests()).rows.some((x) => x.id === request.id)).toBe(false);
  });

  it("R-209 (P2c QA O-4): open requests are newest first, paged, with the total count", async () => {
    const setup = await matchSetup("M3p");
    const s = await matchSeeker(setup);
    const made = [];
    for (let i = 0; i < 3; i++) {
      made.push(
        await db.interestRequest.create({
          data: { initiator: "EMPLOYER", seekerId: s.id, companyId: setup.employer.companyId },
        }),
      );
    }
    const first = await listOpenInterestRequests({ page: 1, take: 2 });
    expect(first.rows).toHaveLength(2);
    expect(first.total).toBeGreaterThanOrEqual(3);
    expect(first.pageCount).toBe(Math.ceil(first.total / 2));
    for (let i = 1; i < first.rows.length; i++) {
      expect(first.rows[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
        first.rows[i].createdAt.getTime(),
      );
    }
    // the newest request is on page 1 even with an older backlog
    const all = await listOpenInterestRequests({ take: 1000 });
    expect(all.rows[0].createdAt.getTime()).toBeGreaterThanOrEqual(made[2].createdAt.getTime());
    // out-of-range pages clamp to the last page; nonsense pages are page 1
    const far = await listOpenInterestRequests({ page: 1_000_000, take: 2 });
    expect(far.page).toBe(far.pageCount);
    expect((await listOpenInterestRequests({ page: Number.NaN, take: 2 })).page).toBe(1);
    expect((await listOpenInterestRequests({ page: -3, take: 2 })).page).toBe(1);
  });

  it("R-209 / R-211: 면접 일정 → 확정 sends the consent request (template only); place refuses contacts", async () => {
    const setup = await matchSetup("M4");
    const s = await matchSeeker(setup);
    const r = await recommendForPosting({
      staffId: setup.staff.id,
      postingId: setup.posting.id,
      seekerId: s.id,
    });
    if (!r.ok) throw new Error("recommend failed");
    const at = new Date(Date.now() + 86_400_000);
    expect(
      await createInterview({
        recommendationId: r.recommendation.id,
        scheduledAt: at,
        place: "사무실, 문의 010-2222-3333",
        interpreter: null,
      }),
    ).toEqual({ ok: false, code: "PLACE_HAS_CONTACT" });
    const created = await createInterview({
      recommendationId: r.recommendation.id,
      scheduledAt: at,
      place: "본사 회의실",
      interpreter: "베트남어 통역",
    });
    if (!created.ok) throw new Error("create failed");

    const sent: NotificationMessage[] = [];
    const provider: NotificationProvider = {
      name: "test",
      send: async (m) => {
        sent.push(m);
        return { ok: true, provider: "test", id: "1" };
      },
    };
    expect(await confirmInterview({ interviewId: created.id, provider })).toEqual({ ok: true });
    const iv = await db.interview.findUniqueOrThrow({ where: { id: created.id } });
    expect(iv.status).toBe("CONFIRMED");
    expect(iv.confirmedAt).not.toBeNull();
    expect(sent).toHaveLength(1);
    expect(sent[0].channel).toBe("SMS");
    expect(sent[0].templateKey).toBe(INTERVIEW_CONSENT_TEMPLATE);
    expect(JSON.stringify(sent[0].params)).not.toMatch(/본사|매칭|company/i);
    // a second confirm is a state error, cancel works once
    expect(await confirmInterview({ interviewId: created.id, provider })).toEqual({
      ok: false,
      code: "INTERVIEW_STATE",
    });
    expect(await cancelInterview({ interviewId: created.id })).toEqual({ ok: true });
    expect(await cancelInterview({ interviewId: created.id })).toEqual({
      ok: false,
      code: "INTERVIEW_STATE",
    });
  });
});
