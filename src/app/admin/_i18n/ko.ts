/**
 * 관리자 화면 문구 (한국어 전용 — WO §12, STANDARD 3.6 관리자 예외, PLAN P1e 지침).
 * 관리자 화면은 messages/*.json을 쓰지 않는다. 같은 말을 여러 화면에서 쓰는 문구만 여기에 모은다.
 * 용어: "직원"은 관리자 화면 전용(STANDARD 1.1), 등급은 "구직자 등급" / "리드 등급"으로 구분한다.
 */
import type {
  JobSearchStatus,
  LeadGrade,
  PostingStatus,
  Role,
  SeekerGrade,
  SeekerStatus,
  SeekerTrack,
  StaffTaskType,
} from "@prisma/client";

import {
  INTRO_CONFIRM_MAX_BYTES,
  LEAD_ARCHIVE_NO_CONTACT_DAYS,
  SEEKER_S_ACTIVE_CONFIRM_DAYS,
  SIGNED_URL_TTL_SEC,
} from "@/config/limits";
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
  { href: "/admin/postings", label: "블라인드 공고" },
  { href: "/admin/companies", label: "기업 검증" },
  { href: "/admin/matching", label: "매칭" },
  { href: "/admin/placements", label: "계약" },
  { href: "/admin/visa-cases", label: "체류 사건" },
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

/** Kanban column titles (STANDARD 1.1: 관리자 화면은 "리드 등급"으로 구분, P1e E-2). */
export const LEAD_COLUMN_TITLE: Record<LeadGrade, string> = {
  C: "리드 등급 C",
  B: "리드 등급 B",
  A: "리드 등급 A",
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
  NO_INTENT: "고용 의사 없음 (재접촉금지로 이동)",
  INTERESTED: "관심 있음 (B로)",
  REQUEST_RECEIVED: "구인신청 접수 (B로)",
  DNC: "재접촉 거부 (재접촉금지로 이동)",
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

/** Confirmation for outcomes that move the lead to 재접촉금지 (FINAL_CALL_OUTCOMES, Q-14). */
export const CALL_FINAL_CONFIRM = {
  title: "재접촉금지로 옮길까요?",
  body: "이 결과를 저장하면 리드 등급이 재접촉금지로 바뀝니다. 되돌릴 수 없고, 이 리드에는 다시 전화하지 않습니다.",
  confirm: "저장하고 재접촉금지로 이동",
  cancel: "취소",
} as const;

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
  FORBIDDEN: "이 작업을 할 권한이 없습니다.",
  UNAUTHENTICATED: "다시 로그인해 주세요.",
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
  CONFIRM_REQUIRED: "재접촉금지로 옮기는 결과는 확인 후에 저장합니다.",
  LEAD_DNC: "재접촉금지 리드에는 통화를 기록하지 않습니다.",
  INVALID_TRANSITION:
    "지금 등급에서는 이 결과로 바꿀 수 없습니다. 새로고침한 뒤 다시 확인해 주세요.",
  NOTE_HAS_CONTACT: "메모에 전화번호·이메일 같은 연락처를 적지 마세요.",
  LEAD_STATE: "B등급 리드만 검증 완료로 바꿀 수 있습니다.",
  NOT_REQUESTED: "구인신청이 접수된 리드만 검증할 수 있습니다.",
  NO_COMPANY: "회사명이 없는 리드는 검증할 수 없습니다.",
  // P2a 블라인드 공고 (R-201)
  LEAD_NOT_FOUND: "리드를 찾을 수 없습니다. 새로고침해 주세요.",
  LEAD_NOT_A:
    "리드 등급 A(구인신청 + 직원 검증 완료) 리드에서만 블라인드 공고를 만들고 공개할 수 있습니다.",
  TEXT_HAS_CONTACT: "공고 제목·직무에 전화번호·이메일·메신저 같은 연락처를 적지 마세요.",
  TEXT_HAS_COMPANY: "공고 제목·직무에 회사 이름을 넣지 마세요(블라인드 공고).",
  UNKNOWN_REGION: "목록에 있는 시·도와 시·군·구만 고를 수 있습니다.",
  UNKNOWN_INDUSTRY: "목록에 있는 업종만 고를 수 있습니다.",
  POSTING_STATE: "지금 상태에서는 할 수 없는 작업입니다. 새로고침해 주세요.",
  NOT_VERIFIED: "직원 검증(검증자·검증 시각)이 끝나지 않은 공고는 공개할 수 없습니다.",
  // P2b 기업 검증·계약 등록 (R-218)
  SAME_STATE: "이미 그 상태입니다. 새로고침해 주세요.",
  // P2c 매칭·면접·계약·체류 사건 (R-209 ~ R-211, R-216)
  POSTING_NOT_FOUND: "공개·검증된 블라인드 공고만 매칭할 수 있습니다. 새로고침해 주세요.",
  NOT_ELIGIBLE:
    "지금은 추천할 수 없는 구직자입니다(구직자 등급 S·A, 취업 매칭, 활성, 블라인드 프로필 동의, 공고의 채용 가능 비자 조건).",
  INTEREST_NOT_FOUND: "면접 신청·요청을 찾을 수 없습니다. 새로고침해 주세요.",
  PLACE_HAS_CONTACT:
    "면접 장소·통역에 전화번호·이메일·메신저 같은 연락처를 적지 마세요(장소는 기업에 보입니다).",
  INTERVIEW_STATE: "지금 면접 상태에서는 할 수 없는 작업입니다. 새로고침해 주세요.",
  FILE_EMPTY: "파일을 골라 주세요.",
  FILE_TOO_LARGE: `파일이 너무 큽니다. ${Math.floor(INTRO_CONFIRM_MAX_BYTES / (1024 * 1024))}MB 이하로 올려 주세요.`,
  FILE_TYPE: "PDF, JPG, PNG 파일만 올릴 수 있습니다.",
  UPLOAD_FAILED: `파일을 올리지 못했습니다. ${Math.floor(INTRO_CONFIRM_MAX_BYTES / (1024 * 1024))}MB 이하의 PDF·JPG·PNG 파일인지 확인하고 다시 올려 주세요.`,
  PLACEMENT_EXISTS: "이 추천에는 이미 계약이 등록되어 있습니다.",
  COMPANY_NOT_FOUND: "기업을 찾을 수 없습니다. 기업 ID를 확인해 주세요.",
};

/** P2c 면접 상태 (src/lib/recommendations/interviews.ts). */
export const INTERVIEW_STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "일정 잡힘(확정 전)",
  CONFIRMED: "면접 확정",
  CANCELLED: "취소",
};

export const INTERVIEW_RESULT_LABEL: Record<string, string> = {
  PENDING: "결과 대기",
  HIRED: "채용",
  REJECTED: "불합격",
  NO_SHOW: "노쇼",
};

/** R-211 면접 건별 이름 제공 동의 상태 (직원 화면). */
export const INTERVIEW_CONSENT_LABEL = {
  NOT_ASKED: "확정 전 — 아직 묻지 않음",
  PENDING: "구직자 응답 대기",
  AGREED: "동의 — 이 면접의 기업에 실명만 표시",
  DECLINED: "동의하지 않음",
} as const;

export const INTEREST_STATUS_LABEL: Record<string, string> = {
  RECEIVED: "접수(추천 전)",
  RECOMMENDED: "추천 완료",
};

export const INTEREST_INITIATOR_LABEL: Record<string, string> = {
  SEEKER: "구직자 면접 신청",
  EMPLOYER: "기업 면접 요청",
};

export const FEE_STATUS_LABEL: Record<string, string> = {
  UNBILLED: "청구 전",
  BILLED: "청구함",
  PAID: "입금 완료",
  WAIVED: "면제",
};

export const VISA_CASE_TYPE_LABEL: Record<string, string> = {
  CHANGE: "체류자격 변경",
  EXTEND: "체류기간 연장",
  REPORT: "신고",
  OTHER: "기타",
};

export const VISA_CASE_STATUS_LABEL: Record<string, string> = {
  OPEN: "접수",
  IN_PROGRESS: "준비 중",
  FILED: "신청함",
  DECIDED: "결과 나옴",
  CLOSED: "종결",
};

/** 소개 확인서 업로드 안내 (R-210, limits.ts 값). */
export const INTRO_CONFIRM_HINT = `PDF·JPG·PNG, ${Math.floor(INTRO_CONFIRM_MAX_BYTES / (1024 * 1024))}MB 이하.`;

/** R-210 서명 URL 안내 (값은 limits.ts). */
export const SIGNED_URL_NOTE = `파일은 ${Math.round(SIGNED_URL_TTL_SEC / 60)}분 동안만 열리는 서명 링크로 엽니다. 열 때마다 감사 로그가 남습니다.`;

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
/** 원화 (STANDARD 3.5·S-32: `Intl` currency KRW, 관리자는 ko-KR 고정). */
const wonFmt = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});
const countFmt = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });

export function fmtWon(n: number | null | undefined): string {
  return n == null ? "—" : wonFmt.format(n);
}
/** YYYY-MM-DD in KST, for `<input type="date">` default values. */
export function isoDay(d: Date | null | undefined): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(d);
}

// ─── 구인 의뢰 내용 (JobLead.requestJson, R-125 / P1e E-5) ───────────────────────────────────

type RequestField = {
  label: string;
  kind: "text" | "won" | "count" | "people";
  options?: Record<string, string>;
};

/** Keys written by src/lib/employer/jobRequest.ts, in display order, with the form's Korean wording. */
const REQUEST_FIELDS: Record<string, RequestField> = {
  role: { label: "직무", kind: "text" },
  payMin: { label: "월 급여 최저(세전)", kind: "won" },
  payMax: { label: "월 급여 최고(세전)", kind: "won" },
  workHours: { label: "근무시간", kind: "text" },
  overtime: {
    label: "잔업",
    kind: "text",
    options: { NONE: "없음", SOMETIMES: "가끔 있음", REGULAR: "자주 있음", UNKNOWN: "모름" },
  },
  headcount: { label: "채용 인원", kind: "people" },
  startTiming: {
    label: "채용 시기",
    kind: "text",
    options: {
      IMMEDIATE: "바로",
      WITHIN_1M: "1개월 안",
      WITHIN_3M: "3개월 안",
      UNDECIDED: "정하지 않음",
    },
  },
  dormitory: {
    label: "숙소",
    kind: "text",
    options: { PROVIDED: "제공", ALLOWANCE: "주거비 도움", NONE: "없음" },
  },
  meals: {
    label: "식사",
    kind: "text",
    options: { PROVIDED: "제공", PARTIAL: "일부 제공", NONE: "없음" },
  },
  employeeCount: { label: "상시근로자 수", kind: "people" },
  preferences: { label: "희망 조건", kind: "text" },
  detail: { label: "그 밖의 요청", kind: "text" },
};

export const REQUEST_OTHER_LABEL = "기타 항목";
const YES_NO = { true: "예", false: "아니요" } as const;

function requestValue(field: RequestField | undefined, v: unknown): string {
  if (typeof v === "number") {
    if (field?.kind === "won") return fmtWon(v);
    if (field?.kind === "people") return `${countFmt.format(v)}명`;
    return countFmt.format(v);
  }
  if (typeof v === "boolean") return YES_NO[String(v) as "true" | "false"];
  if (typeof v === "string") return field?.options?.[v] ?? v;
  if (Array.isArray(v)) {
    return v
      .map((x) => requestValue(field, x))
      .filter((t) => t !== "")
      .join(", ");
  }
  if (v != null && typeof v === "object") {
    // QA O-4: a nested object is summarised by its filled entries, never printed as keys or JSON.
    const n = Object.values(v).filter((x) => x != null && x !== "").length;
    return n > 0 ? `(세부 항목 ${countFmt.format(n)}개)` : "";
  }
  return "";
}

/**
 * 구인 의뢰 JSON → Korean label/value rows (관리자 한국어 전용, STANDARD 3.6). Known keys use the
 * form's labels and option words; unknown keys are grouped under "기타 항목" without exposing the
 * raw key, and nested objects are shown only as "(세부 항목 n개)", never as keys or JSON.
 */
export function requestRows(value: unknown): { label: string; value: string }[] {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return [];
  const obj = value as Record<string, unknown>;
  const present = (v: unknown) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0);
  const rows: { label: string; value: string }[] = [];
  for (const [key, field] of Object.entries(REQUEST_FIELDS)) {
    const v = obj[key];
    if (!present(v)) continue;
    const text = requestValue(field, v);
    if (text) rows.push({ label: field.label, value: text });
  }
  const other = Object.entries(obj)
    .filter(([k, v]) => !(k in REQUEST_FIELDS) && present(v))
    .map(([, v]) => requestValue(undefined, v))
    .filter((t) => t !== "");
  if (other.length > 0) rows.push({ label: REQUEST_OTHER_LABEL, value: other.join(" · ") });
  return rows;
}

// ─── 블라인드 공고 (P2a, R-201) ─────────────────────────────────────────────────────────────

export const POSTING_STATUS_LABEL: Record<PostingStatus, string> = {
  DRAFT: "작성됨",
  PUBLISHED: "공개 중",
  CLOSED: "마감",
};

/** Korean labels of the coded posting fields (src/schemas/admin/postings.ts). */
export const POSTING_CODE_LABEL = {
  dormitory: { NONE: "없음", FREE: "무료 제공", PAID: "유상 제공" },
  meals: { PROVIDED: "제공", PARTIAL: "일부 제공", NONE: "없음" },
  overtimeNote: { NONE: "없음", SOMETIMES: "가끔 있음", REGULAR: "자주 있음" },
  shift: { DAY: "주간 근무", TWO_SHIFT: "2교대", THREE_SHIFT: "3교대", NIGHT: "야간 근무" },
} as const satisfies Record<string, Record<string, string>>;

export function postingCodeLabel(
  group: keyof typeof POSTING_CODE_LABEL,
  value: string | null | undefined,
): string {
  if (!value) return "—";
  return (POSTING_CODE_LABEL[group] as Record<string, string>)[value] ?? value;
}

/** Counts with a Korean unit (STANDARD 3.5 H-3: `Intl` number + 명·건). */
export function fmtPeople(n: number | null | undefined): string {
  return n == null ? "—" : `${countFmt.format(n)}명`;
}
export function fmtCount(n: number, unit = ""): string {
  return `${countFmt.format(n)}${unit}`;
}

/** Form field names → Korean (INVALID_INPUT feedback of the create form). */
export const POSTING_FIELD_LABEL: Record<string, string> = {
  blindTitle: "블라인드 제목",
  role: "직무",
  industryCode: "업종",
  sido: "시·도",
  sigungu: "시·군·구",
  payMin: "월 급여 최저",
  payMax: "월 급여 최고",
  overtimeNote: "잔업",
  dormitory: "숙소",
  meals: "식사",
  shift: "교대",
  headcount: "채용 인원",
  eligibleVisas: "채용 가능 비자",
};
