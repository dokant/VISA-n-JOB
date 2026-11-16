/**
 * Public blind posting serializer (BR-03, WO §8.5, PRD R-202, STANDARD 4.4 `BLIND_JOB_FIELDS`).
 *
 * Every posting that leaves the server for a seeker or a visitor (`/[locale]/jobs`, `/api/jobs`)
 * goes through `serializePublicPosting`. It builds a NEW object key by key from the WO §8.5 display
 * list only — no spread, no blacklist — so a column added to JobPosting (or a relation such as the
 * company or the lead) can never reach the response by accident:
 * - `PUBLIC_POSTING_SELECT` reads only the columns the list needs (no companyId, leadId, verifiedBy,
 *   company, lead).
 * - `PublicPosting` is a mapped type over `BLIND_JOB_FIELDS`; the object literal below is checked
 *   against it, so a key outside the list is a type error (excess property check), and a missing key
 *   is a type error too.
 * Never included: 회사명, 상세 주소, 담당자, 연락처, 사업자번호 (BR-03), verifier id, lead / company ids.
 *
 * WO §8.5 표시 항목 → field:
 *   블라인드 제목 blindTitle · 시·도(·시군구) sido, sigungu · 업종 industryCode · 직무 role ·
 *   급여 payMin, payMax · 잔업 안내 overtimeNote · 숙소 dormitory · 식사 meals · 교대 shift ·
 *   채용 인원 headcount · 채용 가능 비자 eligibleVisas · "검증 완료" 배지 verified ·
 *   직업소개사업 등록번호 placementRegNo (site.config, the operator's number — not the company's).
 *   `id` is the posting's own id, needed for the detail link and 면접 신청 (not a company identifier).
 */
import type { Prisma } from "@prisma/client";

import { getSiteConfig } from "@/config/site.config";

export const BLIND_JOB_FIELDS = [
  "id",
  "blindTitle",
  "sido",
  "sigungu",
  "industryCode",
  "role",
  "payMin",
  "payMax",
  "overtimeNote",
  "dormitory",
  "meals",
  "shift",
  "headcount",
  "eligibleVisas",
  "verified",
  "placementRegNo",
] as const;

export type BlindJobField = (typeof BLIND_JOB_FIELDS)[number];

/** Columns read for a public posting. Nothing else is selected. */
export const PUBLIC_POSTING_SELECT = {
  id: true,
  blindTitle: true,
  sido: true,
  sigungu: true,
  industryCode: true,
  role: true,
  payMin: true,
  payMax: true,
  overtimeNote: true,
  dormitory: true,
  meals: true,
  shift: true,
  headcount: true,
  eligibleVisas: true,
  verifiedAt: true,
} as const satisfies Prisma.JobPostingSelect;

export type PublicPostingRow = Prisma.JobPostingGetPayload<{
  select: typeof PUBLIC_POSTING_SELECT;
}>;

type FieldTypes = {
  id: string;
  blindTitle: string;
  sido: string;
  sigungu: string | null;
  industryCode: string;
  role: string;
  payMin: number;
  payMax: number | null;
  overtimeNote: string | null;
  dormitory: string;
  meals: string | null;
  shift: string | null;
  headcount: number;
  eligibleVisas: string[];
  verified: true;
  placementRegNo: string | null;
};

/** Exactly the WO §8.5 keys (a mapped type: no other key can be added to a value of this type). */
export type PublicPosting = { readonly [K in BlindJobField]: FieldTypes[K] };

/**
 * Builds the public object from a row. The caller must have filtered to PUBLISHED + verified
 * postings of grade-A leads (src/lib/postings/public.ts); a row without `verifiedAt` is refused here
 * as well (WO §15-4), so the "검증 완료" badge is never shown on an unverified posting.
 */
export function serializePublicPosting(
  row: PublicPostingRow,
  placementRegNo: string = getSiteConfig().jobPlacementAgency.jobPlacementRegNo,
): PublicPosting {
  if (!row.verifiedAt) throw new Error("serializePublicPosting: posting is not verified");
  const out: PublicPosting = {
    id: row.id,
    blindTitle: row.blindTitle,
    sido: row.sido,
    sigungu: row.sigungu,
    industryCode: row.industryCode,
    role: row.role,
    payMin: row.payMin,
    payMax: row.payMax,
    overtimeNote: row.overtimeNote,
    dormitory: row.dormitory,
    meals: row.meals,
    shift: row.shift,
    headcount: row.headcount,
    eligibleVisas: [...row.eligibleVisas],
    verified: true,
    placementRegNo: placementRegNo.trim() || null,
  };
  return Object.freeze(out);
}
