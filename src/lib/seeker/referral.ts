/**
 * Referral codes and entry parameters (R-111, WO §7.2).
 *
 * - `?ref=코드&src=채널` on any page is kept in two cookies by the middleware until registration,
 *   then stored as `SeekerProfile.referredByCode` / `sourceChannel`.
 * - Every seeker gets a unique `referralCode` (REFERRAL_CODE_LENGTH characters from an alphabet
 *   without look-alike characters). Uniqueness is guaranteed by the DB unique index; callers retry.
 * Edge-safe (used by the middleware): no Node or Prisma import.
 */
import { REFERRAL_CODE_LENGTH } from "@/config/limits";

export const REF_COOKIE = "vj_ref";
export const SRC_COOKIE = "vj_src";

/** No 0/O, 1/I/L: easy to read aloud and to type from a poster. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Random referral code (Web Crypto, works in Node and Edge). */
export function generateReferralCode(): string {
  const bytes = new Uint8Array(REFERRAL_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Normalised referral code (upper case) or null when the value cannot be a code. */
export function normalizeReferralCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return new RegExp(`^[A-Z0-9]{${REFERRAL_CODE_LENGTH}}$`).test(code) ? code : null;
}

/** Source channel label (QR_xxx, FB_VN, UNIV_xxx …) or null. Letters, digits, "_" and "-" only. */
export function normalizeSourceChannel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const src = value.trim();
  return /^[A-Za-z0-9_-]{1,40}$/.test(src) ? src : null;
}

/** Path of the quick signup link a seeker shares (locale prefix added by the caller). */
export function referralSharePath(code: string): string {
  return `/seeker/register/quick?ref=${encodeURIComponent(code)}&src=REFERRAL`;
}
