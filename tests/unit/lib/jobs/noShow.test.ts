/**
 * R-213 / WO §7.7 노쇼 처리: recording NO_SHOW raises `noShowCount` (a corrected result lowers it);
 * with 2 or more the seeker is listed after every other seeker in 추천 (internal mark only, never in
 * the blind serializer); the nightly job repairs counts that differ from the records.
 */
import { afterAll, describe, expect, it } from "vitest";

import { NO_SHOW_DEPRIORITIZE_COUNT } from "@/config/limits";
import { db } from "@/lib/db";
import { isNoShowDeprioritized, recountNoShows, syncNoShowCounts } from "@/lib/jobs/noShow";
import { recordInterviewResult } from "@/lib/recommendations/interviews";
import { matchCandidates } from "@/lib/recommendations/matching";
import { BLIND_SEEKER_FIELDS } from "@/lib/serializers/blindSeeker";

import { matchSeeker, matchSetup, recommendedInterview } from "../recommendations/matchingFixtures";

afterAll(() => db.$disconnect());

const count = async (id: string) =>
  (await db.seekerProfile.findUniqueOrThrow({ where: { id } })).noShowCount;

describe("R-213 no-show handling", () => {
  it("NO_SHOW results raise the count, a corrected result lowers it (2 or more → deprioritized)", async () => {
    const setup = await matchSetup("NS1");
    const s = await matchSeeker(setup);
    const first = await recommendedInterview(setup, s.id);
    const second = await recommendedInterview(setup, s.id);

    await recordInterviewResult({
      interviewId: first.interview.id,
      attended: false,
      result: "NO_SHOW",
    });
    expect(await count(s.id)).toBe(1);
    expect(isNoShowDeprioritized(1)).toBe(false);
    // recording the same result again does not count twice
    await recordInterviewResult({
      interviewId: first.interview.id,
      attended: false,
      result: "NO_SHOW",
    });
    expect(await count(s.id)).toBe(1);

    await recordInterviewResult({
      interviewId: second.interview.id,
      attended: false,
      result: "NO_SHOW",
    });
    expect(await count(s.id)).toBe(2);
    expect(NO_SHOW_DEPRIORITIZE_COUNT).toBe(2);
    expect(isNoShowDeprioritized(2)).toBe(true);

    // staff correct one result → 1
    await recordInterviewResult({
      interviewId: second.interview.id,
      attended: true,
      result: "REJECTED",
    });
    expect(await count(s.id)).toBe(1);
  });

  it("추천: a seeker with 2 no-shows comes after every other eligible seeker, even an S; marked internally only", async () => {
    const setup = await matchSetup("NS2");
    const noShow = await matchSeeker(setup, { grade: "S", verifiedKorean: true });
    const plainA = await matchSeeker(setup);
    const plainA2 = await matchSeeker(setup);
    for (let i = 0; i < 2; i++) {
      const { interview } = await recommendedInterview(setup, noShow.id);
      await recordInterviewResult({
        interviewId: interview.id,
        attended: false,
        result: "NO_SHOW",
      });
    }
    const list = await matchCandidates(setup.posting, "strict");
    expect(list.map((c) => c.id).slice(-1)).toEqual([noShow.id]);
    expect(new Set(list.slice(0, 2).map((c) => c.id))).toEqual(new Set([plainA.id, plainA2.id]));
    expect(list.find((c) => c.id === noShow.id)).toMatchObject({
      deprioritized: true,
      noShowCount: 2,
    });
    expect(list.find((c) => c.id === plainA.id)?.deprioritized).toBe(false);
    // never part of what companies receive (WO §7.5 whitelist)
    expect(BLIND_SEEKER_FIELDS as readonly string[]).not.toContain("noShowCount");
  });

  it("nightly sync repairs counts that differ from the interview records", async () => {
    const setup = await matchSetup("NS3");
    const s = await matchSeeker(setup);
    const ghost = await matchSeeker(setup);
    const { interview } = await recommendedInterview(setup, s.id);
    await recordInterviewResult({ interviewId: interview.id, attended: false, result: "NO_SHOW" });
    // counts edited outside the app
    await db.seekerProfile.update({ where: { id: s.id }, data: { noShowCount: 5 } });
    await db.seekerProfile.update({ where: { id: ghost.id }, data: { noShowCount: 3 } });

    const r = await syncNoShowCounts(new Date(), { scope: { id: { in: [s.id, ghost.id] } } });
    expect(r).toEqual({ checked: 2, updated: 2 });
    expect(await count(s.id)).toBe(1);
    expect(await count(ghost.id)).toBe(0);
    // nothing left to repair
    expect(await syncNoShowCounts(new Date(), { scope: { id: { in: [s.id, ghost.id] } } })).toEqual(
      {
        checked: 1,
        updated: 0,
      },
    );
    expect(await recountNoShows(s.id)).toBe(1);
  });
});
