/**
 * R-114 / WO §8.1: KSIC section and region (+ 인구감소지역) tagging from the seed tables.
 * Pure tests use a small fixture table; one test runs against the seeded Region / Industry rows.
 */
import { describe, expect, it } from "vitest";

import {
  type RegionRow,
  buildTaggingTables,
  loadTaggingTables,
  matchSido,
  tagIndustry,
  tagRegion,
} from "@/lib/leads/tagging";

const regions: RegionRow[] = [
  {
    code: "SEOULX",
    level: "SIDO",
    parentCode: null,
    nameKo: "서울특별시",
    depopulationArea: false,
  },
  { code: "CNX", level: "SIDO", parentCode: null, nameKo: "충청남도", depopulationArea: false },
  {
    code: "GWX",
    level: "SIDO",
    parentCode: null,
    nameKo: "강원특별자치도",
    depopulationArea: false,
  },
  {
    code: "CNX_A_SI",
    level: "SIGUNGU",
    parentCode: "CNX",
    nameKo: "가나시",
    depopulationArea: false,
  },
  {
    code: "CNX_B_GUN",
    level: "SIGUNGU",
    parentCode: "CNX",
    nameKo: "다라군",
    depopulationArea: true,
  },
  {
    code: "SEOULX_C_GU",
    level: "SIGUNGU",
    parentCode: "SEOULX",
    nameKo: "다라군",
    depopulationArea: false,
  },
];
const tables = buildTaggingTables(regions, [
  { code: "C", nameKo: "제조업" },
  { code: "F", nameKo: "건설업" },
  { code: "I", nameKo: "숙박 및 음식점업" },
]);

describe("R-114 lead tagging", () => {
  it("matches 시·도 by code, full name, leading part, short 도 form and old names", () => {
    expect(matchSido(tables, "CNX")?.code).toBe("CNX");
    expect(matchSido(tables, "충청남도")?.code).toBe("CNX");
    expect(matchSido(tables, "충남")?.code).toBe("CNX");
    expect(matchSido(tables, "서울")?.code).toBe("SEOULX");
    expect(matchSido(tables, "서울시")?.code).toBe("SEOULX");
    expect(matchSido(tables, "강원")?.code).toBe("GWX");
    expect(matchSido(tables, "강원도")?.code).toBe("GWX");
    expect(matchSido(tables, "부산")).toBeNull();
    expect(matchSido(tables, "")).toBeNull();
    expect(matchSido(tables, undefined)).toBeNull();
  });

  it("tags 시·군·구 within the 시·도 and copies its 인구감소지역 flag", () => {
    expect(tagRegion(tables, { sido: "충남", sigungu: "다라군" })).toEqual({
      sido: "CNX",
      sigungu: "CNX_B_GUN",
      depopulationArea: true,
    });
    // same name under another 시·도 is a different row
    expect(tagRegion(tables, { sido: "서울", sigungu: "다라군" })).toEqual({
      sido: "SEOULX",
      sigungu: "SEOULX_C_GU",
      depopulationArea: false,
    });
    expect(tagRegion(tables, { sido: "충남", sigungu: "가나시 동남구" })?.sigungu).toBe("CNX_A_SI");
    expect(tagRegion(tables, { sido: "충남", sigungu: "없는군" })).toEqual({
      sido: "CNX",
      sigungu: null,
      depopulationArea: false,
    });
  });

  it("falls back to the address words, and returns null without a known 시·도", () => {
    expect(tagRegion(tables, { address: "충청남도 다라군 어느면 1-2" })).toEqual({
      sido: "CNX",
      sigungu: "CNX_B_GUN",
      depopulationArea: true,
    });
    expect(tagRegion(tables, { sido: "없는도", address: "어딘가 1" })).toBeNull();
    expect(tagRegion(tables, {})).toBeNull();
  });

  it("tags the KSIC section from a letter code or the industry text, never from a guess", () => {
    expect(tagIndustry(tables, { industryCode: "C" })).toBe("C");
    expect(tagIndustry(tables, { industryCode: "c2511" })).toBe("C");
    expect(tagIndustry(tables, { industryCode: "F41" })).toBe("F");
    expect(tagIndustry(tables, { industryName: "제조업" })).toBe("C");
    expect(tagIndustry(tables, { industryName: "제조" })).toBe("C");
    expect(tagIndustry(tables, { industryName: "숙박 및 음식점업" })).toBe("I");
    // numeric division codes are not mapped (no division table in the seed)
    expect(tagIndustry(tables, { industryCode: "25" })).toBeNull();
    expect(tagIndustry(tables, { industryCode: "Z9" })).toBeNull();
    expect(tagIndustry(tables, { industryName: "업" })).toBeNull();
    expect(tagIndustry(tables, {})).toBeNull();
  });

  it("works with the seeded tables (17 시·도, KSIC sections, 인구감소지역 rows)", async () => {
    const seeded = await loadTaggingTables();
    expect(seeded.sidos.length).toBeGreaterThan(0);
    const [sidoCode, rows] = [...seeded.sigunguBySido.entries()].find(([, list]) =>
      list.some((r) => r.depopulationArea),
    ) as [string, RegionRow[]];
    const depop = rows.find((r) => r.depopulationArea) as RegionRow;
    const sido = seeded.sidos.find((s) => s.code === sidoCode) as RegionRow;
    expect(tagRegion(seeded, { sido: sido.nameKo, sigungu: depop.nameKo })).toEqual({
      sido: sidoCode,
      sigungu: depop.code,
      depopulationArea: true,
    });
    const industry = seeded.industries[0];
    expect(tagIndustry(seeded, { industryName: industry.nameKo })).toBe(industry.code);
  });
});
