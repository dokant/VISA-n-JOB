// Operating numbers (STANDARD 4.2 / 4.9, DECISIONS SC-05). These are operator settings, not legal
// values (BR-12). Keep every tunable number of the app here so it can be found and reviewed in one
// place (S-53).

/** R-117 / WO §8.4: demand map looks back this many days. */
export const DEMAND_WINDOW_DAYS = 30;

/** R-117 / WO §8.4 / WO §15-10: cells with fewer samples than this are shown as "자료 부족". */
export const DEMAND_MIN_SAMPLE = 5;

/** R-117: the median offered pay is shown as a band of this width (KRW), never as an exact value. */
export const DEMAND_PAY_BAND_STEP_KRW = 100_000;

/** R-117 / BR-04: lead grades that feed the aggregate (ARCHIVED and DO_NOT_CONTACT are excluded). */
export const DEMAND_LEAD_GRADES = ["C", "B", "A"] as const;

// ─── Authentication (P1b: R-104, R-118, R-123, R-129 OTP·로그인 부분) ─────────────────────────────

/** R-104: a phone may request a new OTP only after this many seconds. */
export const OTP_RESEND_INTERVAL_SEC = 60;

/** R-104: at most this many OTPs per phone within OTP_HOURLY_WINDOW_SEC. */
export const OTP_MAX_PER_HOUR = 5;
export const OTP_HOURLY_WINDOW_SEC = 3_600;

/** R-104: wrong codes allowed per challenge; the next wrong code locks the phone. */
export const OTP_MAX_ATTEMPTS = 5;

/** R-104: while locked, the phone can neither request nor verify an OTP. */
export const OTP_LOCK_SEC = 1_800;

/** OTP lifetime and length. */
export const OTP_TTL_SEC = 300;
export const OTP_CODE_LENGTH = 6;

/**
 * R-129 (OTP·로그인 부분): fixed-window limits kept in Postgres (RateLimitBucket).
 * `perIp` counts every attempt by the client address.
 * Login failures (Q-11, P1c QA D-1) are counted twice and cleared by a successful sign-in:
 * - `loginPerIdentifierIp`: failures of one account from one client address. Stops guessing from
 *   one place without locking the owner, who signs in from another address.
 * - `loginPerIdentifier`: failures of one account from all addresses together. Higher cap — the last
 *   stop against guessing spread over many addresses. Also the only failure limit when the client
 *   address is unknown (`TRUST_PROXY` off, see `clientIp`).
 * 운영 수치: 운영자가 조정한다 (로그인 실패 한도, 계정+IP < 계정 전체).
 */
export const RATE_LIMITS = {
  otpRequestPerIp: { limit: 20, windowSec: 3_600 },
  loginPerIdentifierIp: { limit: 10, windowSec: 900 },
  loginPerIdentifier: { limit: 50, windowSec: 900 },
  loginPerIp: { limit: 30, windowSec: 900 },
  totpVerifyPerUser: { limit: 5, windowSec: 900 },
  signupPerIp: { limit: 10, windowSec: 3_600 },
  // P1d (R-129 수집 API, R-124, R-125). 운영 수치: 운영자가 조정한다.
  /** R-114: batches per API key (the collector agent's identity). */
  ingestPerKey: { limit: 60, windowSec: 60 },
  /** R-114: every call per client address (also before the key check), when the address is known. */
  ingestPerIp: { limit: 120, windowSec: 60 },
  /** R-124: public diagnosis submissions per client address (each one saves a lead). */
  diagnosisPerIp: { limit: 20, windowSec: 3_600 },
  /** R-125: job requests per company per day. */
  jobRequestPerCompany: { limit: 20, windowSec: 86_400 },
} as const;

/** R-118 / R-123: password rules for staff and employer accounts. */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

/** Auth.js JWT session lifetime. Staff sessions are short (admin area, R-118). */
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;
export const STAFF_SESSION_MAX_AGE_SEC = 60 * 60 * 8;

/** R-118: a verified-TOTP proof handed to the session update is valid this long. */
export const TOTP_PROOF_TTL_SEC = 60;

/** R-105 / R-106: the server-side sign-in proof right after registration is valid this long. */
export const SEEKER_SIGNUP_PROOF_TTL_SEC = 60;

// ─── Seeker registration (P1c: R-105 ~ R-113) ──────────────────────────────────────────────────

/** R-111: length of a seeker's referral code (unambiguous upper-case letters and digits). */
export const REFERRAL_CODE_LENGTH = 8;

/** R-111: `?ref` / `?src` are kept in a cookie this long until registration. */
export const REFERRAL_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30;

/** R-105: the "프로필 완성" notice is sent this long after a quick signup (0 = right away). */
export const PROFILE_COMPLETION_NOTICE_DELAY_SEC = 0;

/** WO §7.3 Step 5: desired industries / regions — at most this many each. */
export const DESIRED_MAX_SELECTIONS = 3;

/** WO §7.3 Step 4: at most this many experience rows; months per row up to this value. */
export const EXPERIENCE_MAX_ROWS = 10;
export const EXPERIENCE_MAX_MONTHS = 600;

/** WO §7.3 Step 5 desiredPayMin bands (monthly, before tax, KRW). Operator setting. */
export const DESIRED_PAY_BANDS_KRW = [
  2_000_000, 2_200_000, 2_400_000, 2_600_000, 2_800_000, 3_000_000, 3_500_000, 4_000_000,
] as const;

/** Step 1 birthYear options: ages from SEEKER_MIN_AGE to SEEKER_MAX_AGE (form range only). */
export const SEEKER_MIN_AGE = 15;
export const SEEKER_MAX_AGE = 75;

/** Step 2 entryYear / stayExpiry / Step 3 graduationDate option ranges in years (form range only). */
export const ENTRY_YEAR_RANGE = 40;
export const STAY_EXPIRY_YEARS_AHEAD = 10;
export const STAY_EXPIRY_YEARS_BACK = 2;
export const GRADUATION_YEARS_AHEAD = 6;
export const GRADUATION_YEARS_BACK = 30;

/** WO §7.7 / R-213: stay expiry reminders (days before expiry) shown on /seeker/me/stay. */
export const STAY_ALERT_DAYS = [90, 60, 30] as const;

// ─── Leads and employer intake (P1d: R-114, R-116, R-124, R-125) ─────────────────────────────

/** R-114 / WO §8.1: at most this many leads in one ingest batch. */
export const INGEST_MAX_BATCH = 200;

/**
 * R-114: the collector API key (INGEST_API_KEY) must be at least this long; a shorter or unset
 * server key rejects every ingest request (fail closed, src/lib/leads/ingestAuth.ts).
 */
export const INGEST_API_KEY_MIN_LENGTH = 32;

/** R-116 / WO §8.2: a C lead without contact for this many days is archived. */
export const LEAD_ARCHIVE_NO_CONTACT_DAYS = 30;

/** R-116: leads handled per archive run (the job loops until none are left). */
export const LEAD_ARCHIVE_BATCH = 500;

/** R-116: pg-boss cron for the archive job, in LEAD_JOB_TIMEZONE (daily 03:15). */
export const LEAD_ARCHIVE_CRON = "15 3 * * *";
export const LEAD_JOB_TIMEZONE = "Asia/Seoul";

/** R-124 / WO §9.1: rows of "현재 외국인 고용 현황(비자별 인원)". */
export const DIAGNOSIS_FOREIGN_ROWS_MAX = 10;

/** R-125: the 구인 의뢰 page lists the company's latest requests, at most this many. */
export const JOB_REQUEST_LIST_MAX = 20;
