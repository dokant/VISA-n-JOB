/**
 * R-007: seed results. VisaRule / ScoreTable rows are all isSample=true + DRAFT, seed files carry
 * the SAMPLE comment, VisaType.defaultTrack equals the WO §7.4 table, Region rows are drafts (PC-6).
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import type { SeekerTrack } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";

import { runSeed } from "../../../prisma/seed/index";
import { SIDO, sigunguCode } from "../../../prisma/seed/regions";
import { testPrisma } from "./helpers";

const prisma = testPrisma();
afterAll(() => prisma.$disconnect());

/** WO §7.4 table, transcribed for the test only (code never holds this mapping, R-108). */
const WO_7_4: Record<string, SeekerTrack | null> = {
  "F-2": "JOB_MATCH",
  "F-4": "JOB_MATCH",
  "F-5": "JOB_MATCH",
  "F-6": "JOB_MATCH",
  "H-2": "JOB_MATCH",
  "D-10": "JOB_MATCH",
  "D-2": "CONSULT_ONLY", // 그 외; within the graduation window → JOB_MATCH (checked below)
  "D-4": "CONSULT_ONLY",
  "E-7": "JOB_MATCH",
  "E-9": "FUTURE_POOL",
  "E-10": "FUTURE_POOL",
  "C-4": "CONSULT_ONLY",
  "G-1": "CONSULT_ONLY",
  OTHER: "CONSULT_ONLY",
  "B-1": null,
  "B-2": null,
  "C-3": null,
  NONE: null,
  UNKNOWN: null,
};

describe("R-007 seed", () => {
  it("R-007: every VisaRule row is isSample=true and DRAFT", async () => {
    const rules = await prisma.visaRule.findMany();
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) {
      expect(r.isSample).toBe(true);
      expect(r.status).toBe("DRAFT");
    }
  });

  it("R-007: every ScoreTable row is isSample=true and DRAFT", async () => {
    const tables = await prisma.scoreTable.findMany();
    expect(tables.length).toBeGreaterThan(0);
    for (const t of tables) {
      expect(t.isSample).toBe(true);
      expect(t.status).toBe("DRAFT");
    }
  });

  it("R-007 / BR-12: sample seed files start with the SAMPLE comment", () => {
    for (const f of ["sampleRules.ts", "sampleScoreTable.ts"]) {
      const first = readFileSync(path.join(process.cwd(), "prisma", "seed", f), "utf8").split(
        /\r?\n/,
      )[0];
      expect(first, f).toMatch(/^\/\/ SAMPLE/);
    }
  });

  it("R-007: VisaType.defaultTrack matches the WO §7.4 table", async () => {
    const rows = await prisma.visaType.findMany();
    const actual = Object.fromEntries(rows.map((r) => [r.code, r.defaultTrack]));
    expect(actual).toEqual(WO_7_4);
  });

  it("R-007: WO §7.4 extra conditions are data (D-2 window, D-10 consult, E-7 review, BR-08)", async () => {
    const get = (code: string) => prisma.visaType.findUniqueOrThrow({ where: { code } });
    const d2 = await get("D-2");
    expect(d2.graduationWindowMonths).toBe(6);
    expect(d2.graduationWindowTrack).toBe("JOB_MATCH");
    expect(d2.graduationWindowAutoConsult).toBe(true);
    expect((await get("D-10")).autoConsult).toBe(true);
    expect((await get("E-7")).needsVisaReview).toBe(true);
    for (const code of ["B-1", "B-2", "C-3", "NONE", "UNKNOWN", "OTHER"]) {
      expect((await get(code)).registrable, code).toBe(false);
    }
    for (const code of ["F-4", "E-9", "D-4", "C-4"]) {
      expect((await get(code)).registrable, code).toBe(true);
    }
  });

  it("R-007: KSIC 대분류 21 sections A~U", async () => {
    const codes = (await prisma.industry.findMany({ orderBy: { code: "asc" } })).map((i) => i.code);
    expect(codes).toEqual("ABCDEFGHIJKLMNOPQRSTU".split(""));
  });

  it("R-007 / PC-6: regions are drafts with review flags, 17 시·도, sigungu linked to a 시·도", async () => {
    const regions = await prisma.region.findMany();
    expect(regions.every((r) => r.isSample && r.needsReview)).toBe(true);
    const sido = regions.filter((r) => r.level === "SIDO");
    expect(sido).toHaveLength(17);
    const sidoCodes = new Set(sido.map((s) => s.code));
    const sigungu = regions.filter((r) => r.level === "SIGUNGU");
    expect(sigungu.length).toBeGreaterThan(200);
    expect(sigungu.every((s) => s.parentCode && sidoCodes.has(s.parentCode))).toBe(true);
    expect(sido.some((s) => s.depopulationArea)).toBe(false);
    expect(sigungu.filter((s) => s.depopulationArea).length).toBeGreaterThan(0);
  });

  it("STANDARD 4.3: region codes are UPPER_SNAKE, unique, 시·군·구 = {SIDO}_{로마자}_{GU|GUN|SI}", async () => {
    // Pure check on the seed source: every name maps, no collisions (0), format holds.
    const codes = SIDO.flatMap((s) => [s.code, ...s.sigungu.map((n) => sigunguCode(s.code, n))]);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((c) => /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/.test(c))).toBe(true);
    expect(sigunguCode("GYEONGBUK", "의성군")).toBe("GYEONGBUK_UISEONG_GUN");
    expect(sigunguCode("SEOUL", "중구")).toBe("SEOUL_JUNG_GU");
    expect(sigunguCode("GYEONGGI", "남양주시")).toBe("GYEONGGI_NAMYANGJU_SI");
    expect(() => sigunguCode("SEOUL", "없는구")).toThrow(/no romanization/);
    expect(() => sigunguCode("SEOUL", "중동")).toThrow(/no romanization/);

    // DB: same codes, and Korean names are matched through nameKo (not the code).
    const rows = await prisma.region.findMany({ where: { level: "SIGUNGU" } });
    expect(rows.every((r) => /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/.test(r.code))).toBe(true);
    expect(rows.some((r) => r.code.includes(":"))).toBe(false);
    const uiseong = await prisma.region.findFirstOrThrow({
      where: { parentCode: "GYEONGBUK", nameKo: "의성군" },
    });
    expect(uiseong.code).toBe("GYEONGBUK_UISEONG_GUN");
    expect(uiseong.depopulationArea).toBe(true);
  });

  it("seed is idempotent and never overwrites existing rows", async () => {
    const before = await prisma.region.count();
    await prisma.region.update({ where: { code: "SEJONG" }, data: { needsReview: false } });
    await runSeed(prisma);
    expect(await prisma.region.count()).toBe(before);
    const sejong = await prisma.region.findUniqueOrThrow({ where: { code: "SEJONG" } });
    expect(sejong.needsReview).toBe(false);
    await prisma.region.update({ where: { code: "SEJONG" }, data: { needsReview: true } });
  });
});
