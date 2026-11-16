/**
 * R-123: employer signup — 사업자등록번호 encrypted + HMAC, the same number cannot register twice.
 */
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { bizRegNoHashOf, registerEmployer } from "@/lib/employerAccount";
import { verifyPassword } from "@/lib/password";
import {
  bizRegNoCheckDigit,
  employerSignupSchema,
  isValidBizRegNoChecksum,
  normalizeBizRegNo,
  validBizRegNo,
} from "@/schemas/auth/auth";

import { testPrisma } from "../db/helpers";
import { randomBizRegNo, randomEmail } from "./authFixtures";

const prisma = testPrisma();
afterAll(() => prisma.$disconnect());

async function refs() {
  const industry = await db.industry.findFirstOrThrow({ select: { code: true } });
  const sido = await db.region.findFirstOrThrow({
    where: { level: "SIDO" },
    select: { code: true },
  });
  return { industryCode: industry.code, sido: sido.code };
}

async function input(over: Partial<Record<string, string>> = {}) {
  return employerSignupSchema.parse({
    companyName: "테스트 제조",
    bizRegNo: randomBizRegNo(),
    ...(await refs()),
    email: randomEmail("employer"),
    password: "employer-password-1",
    passwordConfirm: "employer-password-1",
    ...over,
  });
}

describe("R-123 employer signup", () => {
  it("creates Company + EMPLOYER user; bizRegNo and name encrypted, password hashed", async () => {
    const data = await input();
    const r = await registerEmployer(data);
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const company = await db.company.findUniqueOrThrow({ where: { id: r.companyId } });
    expect(company.bizRegNoEnc).toBe(data.bizRegNo);
    expect(company.nameEnc).toBe("테스트 제조");
    expect(company.bizRegNoHash).toBe(bizRegNoHashOf(data.bizRegNo));

    const raw = await prisma.company.findUniqueOrThrow({ where: { id: r.companyId } });
    expect(raw.bizRegNoEnc).toMatch(/^v[0-9]+:/);
    expect(raw.bizRegNoEnc).not.toContain(data.bizRegNo);
    expect(raw.nameEnc).not.toContain("테스트");

    const user = await db.user.findUniqueOrThrow({ where: { id: r.userId } });
    expect(user).toMatchObject({ role: "EMPLOYER", companyId: r.companyId });
    expect(user.password).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(user.password, "employer-password-1")).toBe(true);
  });

  it("R-123: the same 사업자등록번호 cannot sign up again, in any format", async () => {
    const digits = randomBizRegNo();
    expect((await registerEmployer(await input({ bizRegNo: digits }))).ok).toBe(true);
    const dashed = `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
    expect(await registerEmployer(await input({ bizRegNo: dashed }))).toEqual({
      ok: false,
      code: "BIZ_REG_NO_TAKEN",
    });
    const companies = await db.company.count({ where: { bizRegNoHash: bizRegNoHashOf(digits) } });
    expect(companies).toBe(1);
  });

  it("R-123: parallel signups with one number create exactly one company (unique index)", async () => {
    const digits = randomBizRegNo();
    const inputs = await Promise.all([0, 1, 2].map(() => input({ bizRegNo: digits })));
    const results = await Promise.all(inputs.map((i) => registerEmployer(i)));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    for (const r of results.filter((x) => !x.ok)) {
      expect(r).toEqual({ ok: false, code: "BIZ_REG_NO_TAKEN" });
    }
  });

  it("an e-mail already in use is refused; unknown reference codes are refused", async () => {
    const email = randomEmail("dup");
    expect((await registerEmployer(await input({ email }))).ok).toBe(true);
    expect(await registerEmployer(await input({ email: email.toUpperCase() }))).toEqual({
      ok: false,
      code: "EMAIL_TAKEN",
    });
    expect(await registerEmployer(await input({ industryCode: "NOPE" }))).toEqual({
      ok: false,
      code: "INVALID_REFERENCE",
    });
  });

  it("O-4: 국세청 checksum (weights 1,3,7,1,3,7,1,3,5) — computed examples", () => {
    // 2,2,0,8,1,6,2,5,1 → 2+6+0+8+3+42+2+15+5 = 83, + floor(1*5/10)=0 → 83 → (10-3)%10 = 7
    expect(bizRegNoCheckDigit("220816251")).toBe(7);
    expect(isValidBizRegNoChecksum("2208162517")).toBe(true);
    expect(isValidBizRegNoChecksum("2208162510")).toBe(false);
    // 4,6,1,0,8,9,8,6,6 → 172, + floor(6*5/10)=3 → 175 → 5 (QA example 461-08-98661 is invalid)
    expect(bizRegNoCheckDigit("461089866")).toBe(5);
    expect(validBizRegNo("461-08-98665")).toBe("4610898665");
    expect(validBizRegNo("461-08-98661")).toBeNull();
    // 1,2,3,4,5,6,7,8,9 → 1+6+21+4+15+42+7+24+45 = 165, + floor(45/10)=4 → 169 → 1
    expect(bizRegNoCheckDigit("123456789")).toBe(1);
    expect(validBizRegNo("123-45-67891")).toBe("1234567891");
    expect(validBizRegNo("12345")).toBeNull();
  });

  it("O-4: the signup schema and registerEmployer refuse a wrong check digit", async () => {
    const parsed = employerSignupSchema.safeParse({
      companyName: "체크섬 상사",
      bizRegNo: "461-08-98661",
      industryCode: "C",
      sido: "SEOUL",
      email: "checksum@example.test",
      password: "long enough password",
      passwordConfirm: "long enough password",
    });
    expect(parsed.success).toBe(false);
    expect(parsed.success ? [] : parsed.error.issues.map((i) => i.message)).toContain(
      "bizRegNoChecksum",
    );
    expect(await registerEmployer({ ...(await input()), bizRegNo: "461-08-98661" })).toEqual({
      ok: false,
      code: "INVALID_BIZ_REG_NO",
    });
  });

  it("schema: 10-digit number and password rules", () => {
    expect(normalizeBizRegNo("123-45-67890")).toBe("1234567890");
    expect(normalizeBizRegNo("12345")).toBeNull();
    const bad = employerSignupSchema.safeParse({
      companyName: "",
      bizRegNo: "12",
      industryCode: "C",
      sido: "SEOUL",
      email: "x",
      password: "short",
      passwordConfirm: "other",
    });
    expect(bad.success).toBe(false);
    const codes = bad.success
      ? []
      : bad.error.issues.map((i) => `${i.path.join(".")}:${i.message}`);
    expect(codes).toEqual(
      expect.arrayContaining([
        "companyName:required",
        "bizRegNo:invalidBizRegNo",
        "email:invalidEmail",
        "password:passwordTooShort",
      ]),
    );
  });
});
