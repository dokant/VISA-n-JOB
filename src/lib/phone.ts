/**
 * Phone number normalisation for OTP and `phoneHash` lookups (R-104, STANDARD 4.7).
 *
 * Every phone number is reduced to E.164 before hashing, so "010-1234-5678", "01012345678" and
 * "+82 10 1234 5678" map to the same `phoneHash` (otp.ts `phoneHashOf`). A leading national 0 is read as a Korean number
 * (the service runs in Korea); numbers from other countries must start with "+".
 * No Node-only imports: the zod schemas (shared with client forms) use this file.
 */
const E164 = /^\+[1-9][0-9]{7,14}$/;
const KR_COUNTRY = "+82";

/** E.164 string, or null when the input is not a phone number. */
export function normalizePhone(input: string): string | null {
  const compact = input.trim().replace(/[\s().-]/g, "");
  let e164: string;
  if (compact.startsWith("+")) e164 = compact;
  else if (compact.startsWith("00")) e164 = `+${compact.slice(2)}`;
  else if (compact.startsWith("0")) e164 = `${KR_COUNTRY}${compact.slice(1)}`;
  else return null;
  return E164.test(e164) ? e164 : null;
}
