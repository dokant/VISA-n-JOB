/**
 * E2E fixtures for P1b auth (R-104, R-118, R-123): rows in the local development database that the
 * production-build server under test reads. Uses the app's own Prisma client (with the *Enc
 * extension) and the local .env keys, so encrypted / hashed values match what the server expects.
 * Every fixture uses unique e-mails / phones; nothing is deleted (dev DB only).
 */
import { randomInt } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";

import { loginIdentifier, loginRateLimitKeys, totpCodeAt } from "@/lib/authCredentials";
import { db } from "@/lib/db";
import { bizRegNoHashOf } from "@/lib/employerAccount";
import { codeHashOf, phoneHashOf } from "@/lib/otp";
import { hashPassword } from "@/lib/password";
import { consumeRateLimit } from "@/lib/rateLimit";
import { bizRegNoCheckDigit } from "@/schemas/auth/auth";

// Keys and DATABASE_URL are read lazily (first query / first hash), so loading here is early enough.
const envFile = path.join(process.cwd(), ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

export { totpCodeAt };

export const STAFF_PASSWORD = "e2e-staff-password-1";

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomInt(1e9)}@example.test`;
}

export function uniquePhone(): string {
  return `+8210${randomInt(10_000_000, 99_999_999)}`;
}

/** Random 사업자등록번호 with a valid check digit (P1b QA O-4). */
export function uniqueBizRegNo(): string {
  const firstNine = String(randomInt(100_000_000, 999_999_999));
  return `${firstNine}${bizRegNoCheckDigit(firstNine)}`;
}

/** A documentation-range address per test, so per-IP limits never leak between tests or runs. */
export function uniqueIp(): string {
  return `198.18.${randomInt(0, 255)}.${randomInt(1, 254)}`;
}

export async function createStaff(role: "ADMIN" | "STAFF_PLACEMENT" | "STAFF_VISA" = "ADMIN") {
  const email = uniqueEmail(`e2e-${role.toLowerCase()}`);
  await db.user.create({
    data: { role, email, password: await hashPassword(STAFF_PASSWORD), displayName: "E2E 직원" },
  });
  return email;
}

export async function createSeeker(phone: string) {
  await db.user.create({
    data: { role: "SEEKER", phoneEnc: phone, phoneHash: phoneHashOf(phone) },
  });
}

/** Replaces the code of the newest OTP for `phone` (the real one only goes to the server log). */
export async function setLatestOtpCode(phone: string, code: string) {
  const phoneHash = phoneHashOf(phone);
  const latest = await db.otpChallenge.findFirst({
    where: { phoneHash, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!latest) throw new Error("no OTP challenge for this phone");
  await db.otpChallenge.update({
    where: { id: latest.id },
    data: { codeHash: codeHashOf(phoneHash, code) },
  });
}

/** Fills the R-129 per-identifier login bucket for an e-mail. */
export async function exhaustLoginLimit(email: string, ip: string) {
  const [idKey] = loginRateLimitKeys(loginIdentifier("email", email) as string, ip);
  for (let i = 0; i < idKey.rule.limit; i++) await consumeRateLimit(idKey.key, idKey.rule);
}

export async function companyCountByBizRegNo(digits: string): Promise<number> {
  return db.company.count({ where: { bizRegNoHash: bizRegNoHashOf(digits) } });
}
