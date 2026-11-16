/**
 * R-121 / WO §8.3 / PC-5: 전화 우선순위. Tests check the order (PC-5: weights are operator values).
 */
import { describe, expect, it } from "vitest";

import {
  type PriorityLead,
  type PrioritySeeker,
  leadPriority,
  seekerMatchesLead,
  sortByPriority,
} from "@/lib/leads/priority";

const NOW = new Date("2032-01-15T00:00:00Z");
const DAY = 86_400_000;
const W = {
  seekerGrade: { S: 2, A: 1 },
  matchMultiplier: 2,
  depopulationBonus: 3,
  newLeadBonus: 2,
  newLeadDays: 7,
};

function lead(over: Partial<PriorityLead> = {}): PriorityLead {
  return {
    sido: "GYEONGBUK",
    industryCode: "C",
    depopulationArea: false,
    postedAt: new Date(NOW.getTime() - 20 * DAY),
    createdAt: new Date(NOW.getTime() - 20 * DAY),
    ...over,
  };
}
const s = (
  grade: "S" | "A" | "B",
  regions = ["GYEONGBUK"],
  industries = ["C"],
): PrioritySeeker => ({
  grade,
  desiredRegions: regions,
  desiredIndustries: industries,
});

describe("R-121 lead priority", () => {
  it("R-121: region (or ANY) and industry must both match; leads without industry match nobody", () => {
    expect(seekerMatchesLead(s("A"), lead())).toBe(true);
    expect(seekerMatchesLead(s("A", ["ANY"]), lead())).toBe(true);
    expect(seekerMatchesLead(s("A", ["SEOUL"]), lead())).toBe(false);
    expect(seekerMatchesLead(s("A", ["GYEONGBUK"], ["F"]), lead())).toBe(false);
    expect(seekerMatchesLead(s("A"), lead({ industryCode: null }))).toBe(false);
  });

  it("R-121: S·A weighted × multiplier, B ignored, + depopulation + newness; waiting counts people", () => {
    const seekers = [s("S"), s("A"), s("A"), s("B"), s("S", ["SEOUL"])];
    const r = leadPriority(lead(), seekers, NOW, W);
    expect(r).toEqual({
      priority: (2 + 1 + 1) * 2,
      waiting: 3,
      parts: { match: 8, depopulation: 0, newness: 0 },
    });
    const all = leadPriority(
      lead({ depopulationArea: true, postedAt: new Date(NOW.getTime() - 7 * DAY) }),
      seekers,
      NOW,
      W,
    );
    expect(all.priority).toBe(8 + 3 + 2);
    // newness falls back to createdAt when postedAt is missing; 8 days old is not new
    expect(leadPriority(lead({ postedAt: null, createdAt: NOW }), [], NOW, W).priority).toBe(2);
    expect(
      leadPriority(lead({ postedAt: new Date(NOW.getTime() - 8 * DAY) }), [], NOW, W).priority,
    ).toBe(0);
  });

  it("R-121: default order is priority descending (ties: newer first, then id)", () => {
    const t = (d: number) => new Date(NOW.getTime() - d * DAY);
    const rows = [
      { id: "a", priority: 3, createdAt: t(5) },
      { id: "b", priority: 9, createdAt: t(9) },
      { id: "c", priority: 3, createdAt: t(1) },
      { id: "d", priority: 0, createdAt: t(0) },
      { id: "e", priority: 3, createdAt: t(1) },
    ];
    expect(sortByPriority(rows).map((r) => r.id)).toEqual(["b", "c", "e", "a", "d"]);
    expect(rows.map((r) => r.id)).toEqual(["a", "b", "c", "d", "e"]); // input untouched
  });
});
