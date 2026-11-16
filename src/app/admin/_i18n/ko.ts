/**
 * 관리자 화면 문구 (한국어 전용 — WO §12, STANDARD 3.6 관리자 예외, PLAN P1e 지침).
 * 관리자 화면은 messages/*.json을 쓰지 않는다. 같은 말을 여러 화면에서 쓰는 문구만 여기에 모은다.
 * 용어: "직원"은 관리자 화면 전용(STANDARD 1.1), 등급은 "구직자 등급" / "리드 등급"으로 구분한다.
 */
import type {
  JobSearchStatus,
  LeadGrade,
  Role,
  SeekerGrade,
  SeekerStatus,
  SeekerTrack,
  StaffTaskType,
} from "@prisma/client";

import { LEAD_ARCHIVE_NO_CONTACT_DAYS, SEEKER_S_ACTIVE_CONFIRM_DAYS } from "@/config/limits";
import type { GradeRequirement } from "@/lib/admin/seekerReview";
import type { CallOutcome } from "@/schemas/admin/leads";

export const ROLE_LABEL: Record<Role, string> = {
  SEEKER: "구직자",
  EMPLOYER: "기업",
  AGENCY: "협력 소개소",
  STAFF_PLACEMENT: "매칭 담당",
  STAFF_VISA: "비자 담당",
  ADMIN: "관리자",
};

export const NAV = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/seekers", label: "구직자 검토" },
  { href: "/admin/leads", label: "리드 칸반" },
] as const;

export const SEEKER_GRADE_LABEL: Record<SeekerGrade, string> = {
  B: "B등급",
  A: "A등급",
  S: "S등급",
};

export const LEAD_GRADE_LABEL: Record<LeadGrade, string> = {
  C: "C",
  B: "B",
  A: "A",
  ARCHIVED: "보관",
  DO_NOT_CONTACT: "재접촉금지",
};

export const LEAD_COLUMN_HINT: Record<LeadGrade, string> = {
  C: "수집 · 첫 통화 전",
  B: "관심 확인",
  A: "구인신청 + 직원 검증 완료",
  ARCHIVED: `${LEAD_ARCHIVE_NO_CONTACT_DAYS}일 미접촉 · 마감`,
  DO_NOT_CONTACT: "전화하지 않음",
};

export const TRACK_LABEL: Record<SeekerTrack, string> = {
  JOB_MATCH: "취업 매칭",
  FUTURE_POOL: "미래 인력 풀",
  CONSULT_ONLY: "상담 전용",
};

export const SEEKER_STATUS_LABEL: Record<SeekerStatus, string> = {
  ACTIVE: "활성",
  INACTIVE: "비활성",
  EMPLOYED: "취업함",
  BLOCKED: "차단",
};

export const JOB_SEARCH_LABEL: Record<JobSearchStatus, string> = {
  IMMEDIATE: "즉시 가능",
  WITHIN_1M: "1개월 이내",
  EMPLOYED_OPEN: "재직 중 · 이직 가능",
  NOT_SEARCHING: "구직 안 함",
};

export const REQUIREMENT_LABEL: Record<GradeRequirement, string> = {
  CONSULTED: "직원 상담 완료",
  VERIFIED_VISA: "체류자격 확인",
  VERIFIED_KOREAN: "한국어 확인",
  ACTIVE: "구직 상태 활성",
  RECENT_CONFIRM: `최근 ${SEEKER_S_ACTIVE_CONFIRM_DAYS}일 내 상태 확인`,
};

export const CALL_OUTCOME_LABEL: Record<CallOutcome, string> = {
  NO_ANSWER: "부재 · 연결 안 됨",
  NO_INTENT: "지금은 고용 의사 없음",
  INTERESTED: "관심 있음 (B로)",
  REQUEST_RECEIVED: "구인신청 접수 (B로)",
  DNC: "재접촉 거부 (재접촉금지로)",
};

export const STAFF_TASK_LABEL: Record<StaffTaskType, string> = {
  PROFILE_COMPLETION_NOTICE: "프로필 완성 알림",
  CONSULT: "상담",
  VISA_REVIEW: "비자 검토",
  STAY_EXPIRY: "체류 만료",
  STATUS_CHECK: "상태 확인",
  INTEREST_FOLLOWUP: "면접 신청·요청 후속",
  LEAD_REVIEW: "리드 검증",
  OTHER: "기타",
};

export const LEAD_SOURCE_LABEL: Record<string, string> = {
  WORK24_API: "고용24",
  AGENT: "수집",
  MANUAL: "직접 입력",
  DIAGNOSIS: "무료 채용 진단",
  REQUEST: "구인 의뢰",
};

/** Lead title / company fallbacks (P1d: diagnosis leads have no company name or title). */
export const LEAD_NO_TITLE = "제목 없음";
export const LEAD_NO_COMPANY = "회사명 미입력";

const ERROR_TEXT: Record<string, string> = {
  INVALID_INPUT: "입력값을 확인해 주세요.",
  NOT_FOUND: "대상을 찾을 수 없습니다. 새로고침해 주세요.",
  CONFLICT: "다른 직원이 먼저 바꿨습니다. 새로고침한 뒤 다시 확인해 주세요.",
  SAME_GRADE: "이미 그 등급입니다.",
  GRADE_STEP: "승격은 한 단계씩만 할 수 있습니다.",
  REQUIREMENTS_UNMET: "승격 조건을 채우지 않았습니다.",
  GRADE_DEPENDS: "현재 등급의 조건이라 해제할 수 없습니다. 먼저 등급을 내려 주세요.",
  FUTURE_POOL_LOCKED: "이 비자는 미래 인력 풀로만 관리합니다(BR-07).",
  SAME_TRACK: "이미 그 트랙입니다.",
  UNKNOWN_VISA: "목록에 있는 비자만 고를 수 있습니다.",
  NOTHING_TO_SAVE: "바뀐 내용이 없습니다.",
  LEAD_DNC: "재접촉금지 리드에는 통화를 기록하지 않습니다.",
  NOTE_HAS_CONTACT: "메모에 전화번호·이메일 같은 연락처를 적지 마세요.",
  LEAD_STATE: "B등급 리드만 검증 완료로 바꿀 수 있습니다.",
  NOT_REQUESTED: "구인신청이 접수된 리드만 검증할 수 있습니다.",
  NO_COMPANY: "회사명이 없는 리드는 검증할 수 없습니다.",
};

export function adminActionError(code: string): string {
  return ERROR_TEXT[code] ?? "문제가 생겼습니다. 다시 시도해 주세요.";
}

const dateFmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dateTimeFmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const monthFmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "UTC",
  year: "numeric",
  month: "2-digit",
});

export function fmtDate(d: Date | null | undefined): string {
  return d ? dateFmt.format(d) : "—";
}
export function fmtDateTime(d: Date | null | undefined): string {
  return d ? dateTimeFmt.format(d) : "—";
}
/** Stored months (stayExpiry etc.) are the 1st 00:00 UTC of the month. */
export function fmtMonth(d: Date | null | undefined): string {
  return d ? monthFmt.format(d) : "—";
}
export function fmtWon(n: number | null | undefined): string {
  return n == null ? "—" : `${n.toLocaleString("ko-KR")}원`;
}
/** YYYY-MM-DD in KST, for `<input type="date">` default values. */
export function isoDay(d: Date | null | undefined): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(d);
}
