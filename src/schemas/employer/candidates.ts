import { z } from "zod";

import { STAY_REMAINING_BANDS } from "@/config/limits";
import { SHIFT_OK_VALUES, SKILLS, TOPIK_LEVELS } from "@/lib/seeker/options";

/**
 * 기업 후보 열람 필터 8종 (WO §9.3, PRD R-205): 체류자격 `visa`, 잔여기간 구간 `stay`, 한국어(TOPIK
 * 최소 급수) `topik`, 경력 업종 `industry`, 기술 `skill`, 숙소 `dormitory`, 교대 `shift`, 전환 가능
 * 비자 `convertible`. Read from the GET query of /employer/candidates and /api/employer/candidates.
 * Every field is optional; an invalid value is dropped (`""`), never an error page.
 */
export const CANDIDATE_FILTER_KEYS = [
  "visa",
  "stay",
  "topik",
  "industry",
  "skill",
  "dormitory",
  "shift",
  "convertible",
] as const;
export type CandidateFilterKey = (typeof CANDIDATE_FILTER_KEYS)[number];

/** TOPIK minimum levels offered as a filter (0 = 없음 is not a minimum). */
export const TOPIK_FILTER_LEVELS = TOPIK_LEVELS.filter((l) => l !== "0");
/** 교대 filter: the seeker's own answer (모름 is not offered as a filter value). */
export const SHIFT_FILTER_VALUES = SHIFT_OK_VALUES.filter((v) => v !== "UNKNOWN");
export const DORMITORY_FILTER_VALUES = ["YES", "NO"] as const;

const STAY_CODES: readonly string[] = STAY_REMAINING_BANDS.map((b) => b.code);
const CODE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;

const optional = (ok: (v: string) => boolean) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || ok(v))
    .catch("");

export const candidateFilterSchema = z.object({
  visa: optional((v) => CODE.test(v)),
  stay: optional((v) => STAY_CODES.includes(v)),
  topik: optional((v) => (TOPIK_FILTER_LEVELS as readonly string[]).includes(v)),
  industry: optional((v) => CODE.test(v)),
  skill: optional((v) => (SKILLS as readonly string[]).includes(v)),
  dormitory: optional((v) => (DORMITORY_FILTER_VALUES as readonly string[]).includes(v)),
  shift: optional((v) => (SHIFT_FILTER_VALUES as readonly string[]).includes(v)),
  convertible: optional((v) => CODE.test(v)),
});
export type CandidateFilters = z.infer<typeof candidateFilterSchema>;

export const EMPTY_CANDIDATE_FILTERS: CandidateFilters = {
  visa: "",
  stay: "",
  topik: "",
  industry: "",
  skill: "",
  dormitory: "",
  shift: "",
  convertible: "",
};

type QueryValue = string | string[] | null | undefined;

/** Filters from a query string (`URLSearchParams`) or a Next.js `searchParams` object. */
export function parseCandidateFilters(
  query: URLSearchParams | Record<string, QueryValue>,
): CandidateFilters {
  const get = (key: string): string => {
    const v: QueryValue = query instanceof URLSearchParams ? query.get(key) : query[key];
    return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
  };
  return candidateFilterSchema.parse(
    Object.fromEntries(CANDIDATE_FILTER_KEYS.map((k) => [k, get(k)])),
  );
}

/** 면접 요청 (R-207): the blind public id of one candidate (blindSeeker.ts `toBlindPublicId`). */
export const candidateInterviewSchema = z.object({
  publicId: z
    .string()
    .trim()
    .regex(/^[bcdfghjkmnpqrstv]{32}$/),
});
export type CandidateInterviewInput = z.infer<typeof candidateInterviewSchema>;
