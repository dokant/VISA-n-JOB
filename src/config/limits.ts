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
 * `perIdentifier` counts by the hashed e-mail / phone, `perIp` by the client address.
 */
export const RATE_LIMITS = {
  otpRequestPerIp: { limit: 20, windowSec: 3_600 },
  loginPerIdentifier: { limit: 10, windowSec: 900 },
  loginPerIp: { limit: 30, windowSec: 900 },
  totpVerifyPerUser: { limit: 5, windowSec: 900 },
  signupPerIp: { limit: 10, windowSec: 3_600 },
} as const;

/** R-118 / R-123: password rules for staff and employer accounts. */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

/** Auth.js JWT session lifetime. Staff sessions are short (admin area, R-118). */
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;
export const STAFF_SESSION_MAX_AGE_SEC = 60 * 60 * 8;

/** R-118: a verified-TOTP proof handed to the session update is valid this long. */
export const TOTP_PROOF_TTL_SEC = 60;
