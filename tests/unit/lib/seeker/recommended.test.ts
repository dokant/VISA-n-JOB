/**
 * R-212 / DECISIONS PC-13: /seeker/me/recommended = public postings matching visa · region · industry
 * + the seeker's own recommendations. BR-03: no company name, address, place or contact.
 */
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { ownRecommendations, recommendedPostingsFor } from "@/lib/seeker/recommended";

import { COMPANY_NAME } from "../postings/postingFixtures";
import { matchSeeker, matchSetup, recommendedInterview } from "../recommendations/matchingFixtures";

afterAll(() => db.$disconnect());

describe("R-212 / PC-13 recommended jobs", () => {
  it("PC-13: visa + region + industry match; ANY region; unfinished profile gets null", async () => {
    const setup = await matchSetup("R1");
    const seoul = await matchSeeker(setup);
    const any = await matchSeeker(setup, { desiredRegions: ["ANY"], desiredIndustries: [] });
    const busan = await matchSeeker(setup, { desiredRegions: ["BUSAN"] });
    const otherIndustry = await matchSeeker(setup, { desiredIndustries: ["Z"] });
    const unfinished = await matchSeeker(setup, { completedStep: 3 });

    const ids = async (userId: string) =>
      ((await recommendedPostingsFor(userId)) ?? []).map((p) => p.id);
    expect(await ids(seoul.userId)).toEqual([setup.posting.id]);
    expect(await ids(any.userId)).toEqual([setup.posting.id]);
    expect(await ids(busan.userId)).toEqual([]);
    expect(await ids(otherIndustry.userId)).toEqual([]);
    expect(await recommendedPostingsFor(unfinished.userId)).toBeNull();

    // a closed posting is not public any more
    await db.jobPosting.update({ where: { id: setup.posting.id }, data: { status: "CLOSED" } });
    expect(await ids(seoul.userId)).toEqual([]);
  });

  it("PC-13 / BR-03: own recommendations show industry, region, dates and status only", async () => {
    const setup = await matchSetup("R2");
    const s = await matchSeeker(setup);
    await recommendedInterview(setup, s.id, "CONFIRMED");
    const mine = await ownRecommendations(s.userId);
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({
      industryCode: "C",
      sido: "SEOUL",
      publicPostingId: setup.posting.id,
    });
    expect(mine[0].interviews.map((i) => i.status)).toEqual(["CONFIRMED"]);
    const text = JSON.stringify(mine);
    for (const banned of ["회의실", COMPANY_NAME, "매칭 테스트 기업", "nameEnc", "place"]) {
      expect(text).not.toContain(banned);
    }
    // nobody else's records
    const other = await matchSeeker(setup);
    expect(await ownRecommendations(other.userId)).toEqual([]);
  });
});
