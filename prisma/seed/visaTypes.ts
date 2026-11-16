/**
 * VisaType seed — WO §7.4 트랙 분류 표를 그대로 옮긴 운영 매핑 (R-007, R-108).
 *
 * - This is NOT a legal value table. It is the operator's routing table from WO §7.4 and admins may
 *   edit it later. Code must never hard-code a visa → track mapping; it reads these rows.
 * - Codes are top-level visa codes. Sub types (E-7-4, F-2-R …) live in SeekerProfile.visaSubType.
 * - "E-7 계열" = the single "E-7" row (sub types share it).
 * - OTHER (기타): WO §7.4 says CONSULT_ONLY. SC-02 says choosing "모름/기타" ends in a consult request
 *   instead of registration completion → registrable=false, defaultTrack kept as in the table.
 * - UNKNOWN (모름) and NONE (비자 없음) cannot complete registration (BR-08, SC-02).
 * - "만료" is a date check (stayExpiry in the past), not a row.
 * - D-2 graduation window (6 months) is a track condition stored as data (SC-05), not a legal number.
 *
 * - `subTypes` (P1c) = sub type codes offered in wizard Step 2 (code names only, no legal values);
 *   `nextGoal` (P1c) = offered as a Step 6 "다음에 원하는 비자" option (its sub types, else its code).
 *   Examples from WO §7.3 (E-7-x, F-2-x; E-7-4, E-7-4R, F-2-R, F-5, F-4). TODO(operator): review.
 *
 * TODO(operator): review notes / add other visa codes if needed (they default to OTHER handling).
 */
import type { PrismaClient, SeekerTrack } from "@prisma/client";

export type VisaTypeSeed = {
  code: string;
  nameKey: string;
  defaultTrack: SeekerTrack | null;
  registrable: boolean;
  autoConsult?: boolean;
  needsVisaReview?: boolean;
  graduationWindowMonths?: number;
  graduationWindowTrack?: SeekerTrack;
  graduationWindowAutoConsult?: boolean;
  requiresGraduationDate?: boolean;
  subTypes?: string[];
  nextGoal?: boolean;
  /** false = not a 체류자격 code (기타·없음·모름): shown by name only (STANDARD 3.2 VisaLabel B-3) */
  isStatusCode?: boolean;
  note: string;
};

const JOB_MATCH_NOTE = "추천 일자리 안내. 업종 제한 여부는 규칙 DB로 확인";
const CONSULT_NOTE = "상담 신청";
const BLOCKED_NOTE =
  "등록 불가(BR-08): 구직 등록은 취업 가능한 체류자격이 있는 분만 가능 + 체류 상담 신청 링크";

export const VISA_TYPES: VisaTypeSeed[] = [
  // F-2, F-4, F-5, F-6, H-2 → JOB_MATCH
  {
    code: "F-2",
    nameKey: "visaType.f2.name",
    defaultTrack: "JOB_MATCH",
    registrable: true,
    subTypes: ["F-2-R", "F-2-7", "F-2-99"],
    nextGoal: true,
    note: JOB_MATCH_NOTE,
  },
  {
    code: "F-4",
    nameKey: "visaType.f4.name",
    defaultTrack: "JOB_MATCH",
    registrable: true,
    nextGoal: true,
    note: JOB_MATCH_NOTE,
  },
  {
    code: "F-5",
    nameKey: "visaType.f5.name",
    defaultTrack: "JOB_MATCH",
    registrable: true,
    nextGoal: true,
    note: JOB_MATCH_NOTE,
  },
  {
    code: "F-6",
    nameKey: "visaType.f6.name",
    defaultTrack: "JOB_MATCH",
    registrable: true,
    note: JOB_MATCH_NOTE,
  },
  {
    code: "H-2",
    nameKey: "visaType.h2.name",
    defaultTrack: "JOB_MATCH",
    registrable: true,
    note: JOB_MATCH_NOTE,
  },
  // D-10 → JOB_MATCH + 상담 자동 생성
  {
    code: "D-10",
    nameKey: "visaType.d10.name",
    defaultTrack: "JOB_MATCH",
    registrable: true,
    autoConsult: true,
    requiresGraduationDate: true,
    note: "취업과 E-7 전환을 함께 설계합니다",
  },
  // D-2: 졸업 예정 6개월 이내 → JOB_MATCH + 상담 자동 생성 / 그 외 → CONSULT_ONLY
  {
    code: "D-2",
    nameKey: "visaType.d2.name",
    defaultTrack: "CONSULT_ONLY",
    registrable: true,
    graduationWindowMonths: 6,
    graduationWindowTrack: "JOB_MATCH",
    graduationWindowAutoConsult: true,
    requiresGraduationDate: true,
    note: "졸업 예정 6개월 이내: 취업과 E-7 전환을 함께 설계. 그 외: 시간제 취업 허가와 진로 상담 안내",
  },
  // D-4 → CONSULT_ONLY
  {
    code: "D-4",
    nameKey: "visaType.d4.name",
    defaultTrack: "CONSULT_ONLY",
    registrable: true,
    note: "시간제 취업 허가와 진로 상담 안내",
  },
  // E-7 계열 → JOB_MATCH + needsVisaReview
  {
    code: "E-7",
    nameKey: "visaType.e7.name",
    defaultTrack: "JOB_MATCH",
    registrable: true,
    needsVisaReview: true,
    subTypes: ["E-7-1", "E-7-2", "E-7-3", "E-7-4", "E-7-4R"],
    nextGoal: true,
    note: "이직 시 절차가 필요합니다. 행정사가 확인합니다",
  },
  // E-9, E-10 → FUTURE_POOL (BR-07: 기업 비노출)
  {
    code: "E-9",
    nameKey: "visaType.e9.name",
    defaultTrack: "FUTURE_POOL",
    registrable: true,
    note: "사업장 변경은 고용센터 절차. 장기 체류 전환(E-7-4 등) 설계 + 점수 계산기 + 상담",
  },
  {
    code: "E-10",
    nameKey: "visaType.e10.name",
    defaultTrack: "FUTURE_POOL",
    registrable: true,
    note: "사업장 변경은 고용센터 절차. 장기 체류 전환(E-7-4 등) 설계 + 점수 계산기 + 상담",
  },
  // C-4, G-1, 기타 → CONSULT_ONLY
  {
    code: "C-4",
    nameKey: "visaType.c4.name",
    defaultTrack: "CONSULT_ONLY",
    registrable: true,
    note: CONSULT_NOTE,
  },
  {
    code: "G-1",
    nameKey: "visaType.g1.name",
    defaultTrack: "CONSULT_ONLY",
    registrable: true,
    note: CONSULT_NOTE,
  },
  {
    code: "OTHER",
    isStatusCode: false,
    nameKey: "visaType.other.name",
    defaultTrack: "CONSULT_ONLY",
    registrable: false,
    note: "기타: 상담 신청 (SC-02: 등록 완료 대신 상담 신청 안내)",
  },
  // B-1, B-2, C-3, 만료·없음 → 등록 불가 (BR-08)
  {
    code: "B-1",
    nameKey: "visaType.b1.name",
    defaultTrack: null,
    registrable: false,
    note: BLOCKED_NOTE,
  },
  {
    code: "B-2",
    nameKey: "visaType.b2.name",
    defaultTrack: null,
    registrable: false,
    note: BLOCKED_NOTE,
  },
  {
    code: "C-3",
    nameKey: "visaType.c3.name",
    defaultTrack: null,
    registrable: false,
    note: BLOCKED_NOTE,
  },
  {
    code: "NONE",
    isStatusCode: false,
    nameKey: "visaType.none.name",
    defaultTrack: null,
    registrable: false,
    note: BLOCKED_NOTE,
  },
  {
    code: "UNKNOWN",
    isStatusCode: false,
    nameKey: "visaType.unknown.name",
    defaultTrack: null,
    registrable: false,
    note: "모름: 등록 완료 대신 상담 신청 안내 (SC-02)",
  },
];

export async function seedVisaTypes(prisma: PrismaClient): Promise<number> {
  for (const [i, v] of VISA_TYPES.entries()) {
    const data = {
      nameKey: v.nameKey,
      defaultTrack: v.defaultTrack,
      registrable: v.registrable,
      autoConsult: v.autoConsult ?? false,
      needsVisaReview: v.needsVisaReview ?? false,
      graduationWindowMonths: v.graduationWindowMonths ?? null,
      graduationWindowTrack: v.graduationWindowTrack ?? null,
      graduationWindowAutoConsult: v.graduationWindowAutoConsult ?? false,
      requiresGraduationDate: v.requiresGraduationDate ?? false,
      subTypes: v.subTypes ?? [],
      nextGoal: v.nextGoal ?? false,
      isStatusCode: v.isStatusCode ?? true,
      sortOrder: i + 1,
      note: v.note,
    };
    await prisma.visaType.upsert({
      where: { code: v.code },
      create: { code: v.code, ...data },
      update: {},
    });
  }
  return VISA_TYPES.length;
}
