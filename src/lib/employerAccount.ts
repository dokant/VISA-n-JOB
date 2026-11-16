/**
 * Employer signup (PRD R-123): one Company + one EMPLOYER user.
 *
 * - 사업자등록번호 is stored as `bizRegNoEnc` (encrypted by the db.ts extension) and looked up only
 *   by `bizRegNoHash` (HMAC of the 10 digits). The same number cannot register twice: checked
 *   before the write and enforced by the unique index on `bizRegNoHash`.
 * - The password is stored as an argon2 hash. The company name is encrypted (`nameEnc`).
 * - Industry / 시·도 codes must exist in the reference tables.
 */
import { Prisma } from "@prisma/client";

import type { EmployerSignupInput } from "@/schemas/auth/auth";
import { normalizeBizRegNo } from "@/schemas/auth/auth";

import { normalizeEmail } from "./authCredentials";
import { hmacHash } from "./crypto";
import { db } from "./db";
import { hashPassword } from "./password";

export type EmployerSignupResult =
  | { ok: true; userId: string; companyId: string }
  | {
      ok: false;
      code: "BIZ_REG_NO_TAKEN" | "EMAIL_TAKEN" | "INVALID_REFERENCE" | "INVALID_BIZ_REG_NO";
    };

/** `Company.bizRegNoHash` for an already-normalised 10-digit number. */
export function bizRegNoHashOf(digits: string): string {
  return hmacHash(digits);
}

export async function registerEmployer(input: EmployerSignupInput): Promise<EmployerSignupResult> {
  const digits = normalizeBizRegNo(input.bizRegNo);
  if (!digits) return { ok: false, code: "INVALID_BIZ_REG_NO" };
  const bizRegNoHash = bizRegNoHashOf(digits);
  const email = normalizeEmail(input.email);

  const [company, user, industry, region] = await Promise.all([
    db.company.findUnique({ where: { bizRegNoHash }, select: { id: true } }),
    db.user.findUnique({ where: { email }, select: { id: true } }),
    db.industry.findUnique({ where: { code: input.industryCode }, select: { code: true } }),
    db.region.findUnique({ where: { code: input.sido }, select: { level: true } }),
  ]);
  if (company) return { ok: false, code: "BIZ_REG_NO_TAKEN" };
  if (user) return { ok: false, code: "EMAIL_TAKEN" };
  if (!industry || region?.level !== "SIDO") return { ok: false, code: "INVALID_REFERENCE" };

  const passwordHash = await hashPassword(input.password);
  try {
    const created = await db.user.create({
      data: {
        role: "EMPLOYER",
        email,
        password: passwordHash,
        company: {
          create: {
            nameEnc: input.companyName.trim(),
            bizRegNoEnc: digits,
            bizRegNoHash,
            industryCode: input.industryCode,
            sido: input.sido,
          },
        },
      },
      select: { id: true, companyId: true },
    });
    return { ok: true, userId: created.id, companyId: created.companyId as string };
  } catch (e) {
    // Lost a race with a parallel signup: the unique indexes decide.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = JSON.stringify(e.meta?.target ?? "");
      return {
        ok: false,
        code: target.includes("bizRegNoHash") ? "BIZ_REG_NO_TAKEN" : "EMAIL_TAKEN",
      };
    }
    throw e;
  }
}
