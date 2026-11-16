/**
 * Lead tagging with the seed tables (R-114, WO §8.1): KSIC section (Industry) and region
 * (Region 시·도 / 시·군·구 + 인구감소지역 flag).
 *
 * Only data from the Region / Industry tables is used — no region or industry list in code
 * (BR-12, STANDARD 4.9). The tables are agent drafts reviewed by the operator (PC-6), so a value that
 * cannot be matched is left empty (industry) or reported (region) instead of being guessed.
 *
 * The functions are pure over a `TaggingTables` snapshot; `loadTaggingTables()` reads it once per
 * batch.
 */
import { db } from "@/lib/db";

export type RegionRow = {
  code: string;
  level: "SIDO" | "SIGUNGU";
  parentCode: string | null;
  nameKo: string;
  depopulationArea: boolean;
};
export type IndustryRow = { code: string; nameKo: string };

export type TaggingTables = {
  sidos: RegionRow[];
  /** SIGUNGU rows grouped by parent 시·도 code. */
  sigunguBySido: Map<string, RegionRow[]>;
  industries: IndustryRow[];
};

export function buildTaggingTables(regions: RegionRow[], industries: IndustryRow[]): TaggingTables {
  const sidos = regions.filter((r) => r.level === "SIDO");
  const sigunguBySido = new Map<string, RegionRow[]>();
  for (const r of regions) {
    if (r.level !== "SIGUNGU" || !r.parentCode) continue;
    const list = sigunguBySido.get(r.parentCode) ?? [];
    list.push(r);
    sigunguBySido.set(r.parentCode, list);
  }
  return { sidos, sigunguBySido, industries };
}

type Reader = Pick<typeof db, "region" | "industry">;

export async function loadTaggingTables(client: Reader = db): Promise<TaggingTables> {
  const [regions, industries] = await Promise.all([
    client.region.findMany({
      select: {
        code: true,
        level: true,
        parentCode: true,
        nameKo: true,
        depopulationArea: true,
      },
    }),
    client.industry.findMany({ select: { code: true, nameKo: true } }),
  ]);
  return buildTaggingTables(regions, industries);
}

const compact = (s: string) => s.replace(/\s+/g, "");

/** "충청남도" → "충남": the short form of a four-letter 도 name. */
function shortDo(name: string): string | null {
  return name.length === 4 && name.endsWith("도") ? `${name[0]}${name[2]}` : null;
}

/**
 * Short spellings used by job boards for a 시·도 name, derived from the names themselves (no list in
 * code): the table name ("서울특별시"), its leading part ("서울", "경기", "강원"), the short form of a
 * four-letter 도 name ("충남"), and older full names ("강원도", "전라북도", "서울시").
 */
function sidoMatches(row: RegionRow, value: string): boolean {
  const v = compact(value);
  if (!v) return false;
  if (v.toUpperCase() === row.code) return true;
  const name = row.nameKo;
  if (v === name) return true;
  const forms = [v, shortDo(v), /[도시]$/.test(v) ? v.slice(0, -1) : null].filter(
    (f): f is string => !!f && f.length >= 2,
  );
  return forms.some((f) => name.startsWith(f) || f === shortDo(name));
}

export function matchSido(tables: TaggingTables, value: string | undefined): RegionRow | null {
  if (!value) return null;
  const hits = tables.sidos.filter((r) => sidoMatches(r, value));
  return hits.length === 1 ? hits[0] : null;
}

/** First 시·군·구 of the 시·도 whose name equals one of the words (or the code). */
export function matchSigungu(
  tables: TaggingTables,
  sidoCode: string,
  value: string | undefined,
): RegionRow | null {
  if (!value) return null;
  const rows = tables.sigunguBySido.get(sidoCode) ?? [];
  const byCode = rows.find((r) => r.code === value.trim().toUpperCase());
  if (byCode) return byCode;
  const words = value.split(/[\s,]+/).filter(Boolean);
  for (const w of words) {
    const hit = rows.find((r) => r.nameKo === w);
    if (hit) return hit;
  }
  return null;
}

export type RegionTag = {
  sido: string;
  sigungu: string | null;
  depopulationArea: boolean;
};

/**
 * 시·도 from `sido` (or the first word of `address`), 시·군·구 from `sigungu` (or the rest of
 * `address`). `depopulationArea` is the 시·군·구 row's flag; unknown 시·군·구 → false.
 * Returns null when the 시·도 cannot be determined (the lead is rejected: JobLead.sido is required).
 */
export function tagRegion(
  tables: TaggingTables,
  input: { sido?: string; sigungu?: string; address?: string },
): RegionTag | null {
  const addressWords = (input.address ?? "").split(/\s+/).filter(Boolean);
  const sido = matchSido(tables, input.sido) ?? matchSido(tables, addressWords[0]);
  if (!sido) return null;
  const sigungu =
    matchSigungu(tables, sido.code, input.sigungu) ??
    matchSigungu(tables, sido.code, addressWords.slice(1).join(" "));
  return {
    sido: sido.code,
    sigungu: sigungu?.code ?? null,
    depopulationArea: sigungu?.depopulationArea ?? false,
  };
}

/**
 * KSIC section (Industry.code) from a letter-prefixed code ("C", "C25", "c2511") or from the
 * published industry text (exact table name, or a table name that starts with the text, e.g.
 * "제조" → "제조업"). Numeric-only codes ("25") are not mapped: the Industry table holds sections
 * only and the division → section table is not seeded. Unknown → null.
 */
export function tagIndustry(
  tables: TaggingTables,
  input: { industryCode?: string; industryName?: string },
): string | null {
  const code = input.industryCode?.trim().toUpperCase();
  if (code && /^[A-Z]/.test(code)) {
    const hit = tables.industries.find((i) => i.code === code[0]);
    if (hit) return hit.code;
  }
  const name = input.industryName ? compact(input.industryName) : "";
  if (name.length >= 2) {
    const exact = tables.industries.find((i) => compact(i.nameKo) === name);
    if (exact) return exact.code;
    const prefixed = tables.industries.filter((i) => compact(i.nameKo).startsWith(name));
    if (prefixed.length === 1) return prefixed[0].code;
  }
  return null;
}
