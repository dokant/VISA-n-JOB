/**
 * R-118 staff password + TOTP, R-123 employer password, R-104 seeker OTP sign-in,
 * R-129 login rate limits (fake clock).
 */
import { beforeAll, describe, expect, it } from "vitest";

import { RATE_LIMITS, TOTP_PROOF_TTL_SEC } from "@/config/limits";
import {
  authorizeEmployerPassword,
  authorizeSeekerOtp,
  authorizeStaffPassword,
  createTotpProof,
  loginIdentifier,
  sendPhoneOtp,
  startTotpEnrollment,
  totpCodeAt,
  verifyStaffTotp,
  verifyTotpProof,
} from "@/lib/authCredentials";
import { db } from "@/lib/db";
import { phoneHashOf, requestOtp } from "@/lib/otp";
import { hashPassword } from "@/lib/password";

import { at, captureNotifier, plusSec, randomEmail, randomPhone } from "./authFixtures";

const PASSWORD = "correct horse battery";
const T0 = at("2026-11-16T11:00:00.000Z");
let ipSeq = 0;
const ip = () => `192.0.2.${++ipSeq}-${Date.now()}`;

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-test-secret-test-secret-0123";
});

async function createUser(role: "ADMIN" | "STAFF_VISA" | "EMPLOYER" | "SEEKER") {
  const email = randomEmail(role.toLowerCase());
  const user = await db.user.create({
    data: { role, email, password: await hashPassword(PASSWORD) },
  });
  return { user, email };
}

describe("R-118 staff sign-in", () => {
  it("R-118: correct password gives a staff session that is NOT yet 2FA-verified", async () => {
    const { user, email } = await createUser("STAFF_VISA");
    const r = await authorizeStaffPassword({
      email: email.toUpperCase(),
      password: PASSWORD,
      ip: ip(),
    });
    expect(r).toEqual({
      ok: true,
      user: { id: user.id, role: "STAFF_VISA", twoFactorVerified: false, totpEnrolled: false },
    });
  });

  it("wrong password, unknown e-mail and non-staff accounts all fail the same way", async () => {
    const { email } = await createUser("ADMIN");
    const { email: employerEmail } = await createUser("EMPLOYER");
    for (const args of [
      { email, password: "wrong password!!" },
      { email: randomEmail("nobody"), password: PASSWORD },
      { email: employerEmail, password: PASSWORD },
    ]) {
      expect(await authorizeStaffPassword({ ...args, ip: ip() })).toEqual({
        ok: false,
        code: "INVALID_CREDENTIALS",
      });
    }
  });

  it("R-118: TOTP enrolment stores the secret encrypted; the first valid code finishes it", async () => {
    const { user } = await createUser("ADMIN");
    const enrollment = await startTotpEnrollment(user.id);
    expect(enrollment.status).toBe("PENDING");
    if (enrollment.status !== "PENDING") return;
    expect(enrollment.otpauthUri).toMatch(/^otpauth:\/\/totp\//);
    // resuming shows the same secret
    expect(await startTotpEnrollment(user.id)).toMatchObject({ secret: enrollment.secret });

    const raw = await db.$queryRaw<Array<{ totpSecret: string }>>`
      SELECT "totpSecret" FROM "User" WHERE "id" = ${user.id}`;
    expect(raw[0].totpSecret).toMatch(/^v[0-9]+:/);
    expect(raw[0].totpSecret).not.toContain(enrollment.secret);

    const now = new Date();
    expect(await verifyStaffTotp({ userId: user.id, code: "000000", now })).toEqual({
      ok: false,
      code: "INVALID_CODE",
    });
    const code = totpCodeAt(enrollment.secret, now);
    expect(await verifyStaffTotp({ userId: user.id, code, now })).toEqual({ ok: true });
    const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.totpEnabledAt).not.toBeNull();
    expect(await startTotpEnrollment(user.id)).toEqual({ status: "ENROLLED" });

    const login = await authorizeStaffPassword({
      email: after.email ?? "",
      password: PASSWORD,
      ip: ip(),
    });
    expect(login.ok && login.user.totpEnrolled).toBe(true);
  });

  it("R-129: TOTP attempts are limited per user", async () => {
    const { user } = await createUser("STAFF_VISA");
    const e = await startTotpEnrollment(user.id);
    if (e.status !== "PENDING") throw new Error("expected pending");
    for (let i = 0; i < RATE_LIMITS.totpVerifyPerUser.limit; i++) {
      expect((await verifyStaffTotp({ userId: user.id, code: "000000", now: T0 })).ok).toBe(false);
    }
    const limited = await verifyStaffTotp({
      userId: user.id,
      code: totpCodeAt(e.secret, T0),
      now: T0,
    });
    expect(limited).toMatchObject({ ok: false, code: "RATE_LIMITED" });
  });

  it("non-staff accounts cannot enrol or verify TOTP", async () => {
    const { user } = await createUser("EMPLOYER");
    await expect(startTotpEnrollment(user.id)).rejects.toThrow(/not a staff/);
    expect(await verifyStaffTotp({ userId: user.id, code: "123456" })).toEqual({
      ok: false,
      code: "NOT_ENROLLED",
    });
  });

  it("R-118: the session upgrade proof is bound to the user, signed and short-lived", () => {
    const proof = createTotpProof("user-1", T0);
    const [id, exp, sig] = proof.split(".");
    expect(verifyTotpProof(proof, "user-1", T0)).toBe(true);
    expect(verifyTotpProof(proof, "user-2", T0)).toBe(false);
    expect(verifyTotpProof(proof, "user-1", plusSec(T0, TOTP_PROOF_TTL_SEC + 1))).toBe(false);
    expect(verifyTotpProof(`${id}.${Number(exp) + 9999}.${sig}`, "user-1", T0)).toBe(false);
    expect(verifyTotpProof(`${id}.${exp}.forged`, "user-1", T0)).toBe(false);
    expect(verifyTotpProof({ twoFactorVerified: true }, "user-1", T0)).toBe(false);
    expect(verifyTotpProof(undefined, "user-1", T0)).toBe(false);
  });
});

describe("R-123 employer sign-in", () => {
  it("only EMPLOYER accounts pass the employer provider", async () => {
    const { user, email } = await createUser("EMPLOYER");
    expect(await authorizeEmployerPassword({ email, password: PASSWORD, ip: ip() })).toMatchObject({
      ok: true,
      user: { id: user.id, role: "EMPLOYER" },
    });
    const { email: staffEmail } = await createUser("ADMIN");
    expect(
      await authorizeEmployerPassword({ email: staffEmail, password: PASSWORD, ip: ip() }),
    ).toEqual({ ok: false, code: "INVALID_CREDENTIALS" });
  });

  it("R-129: the 11th sign-in attempt for one e-mail within 15 minutes is rate limited", async () => {
    const { email } = await createUser("EMPLOYER");
    const limit = RATE_LIMITS.loginPerIdentifier.limit;
    for (let i = 0; i < limit; i++) {
      const r = await authorizeEmployerPassword({ email, password: "bad", ip: ip(), now: T0 });
      expect(r).toEqual({ ok: false, code: "INVALID_CREDENTIALS" });
    }
    // even the right password is refused while limited
    const limited = await authorizeEmployerPassword({
      email,
      password: PASSWORD,
      ip: ip(),
      now: T0,
    });
    expect(limited).toMatchObject({ ok: false, code: "RATE_LIMITED" });
    const later = plusSec(T0, RATE_LIMITS.loginPerIdentifier.windowSec);
    expect(
      (await authorizeEmployerPassword({ email, password: PASSWORD, ip: ip(), now: later })).ok,
    ).toBe(true);
  });

  it("R-129: one IP is limited across different e-mails", async () => {
    const shared = ip();
    for (let i = 0; i < RATE_LIMITS.loginPerIp.limit; i++) {
      await authorizeEmployerPassword({
        email: randomEmail("x"),
        password: "x",
        ip: shared,
        now: T0,
      });
    }
    const r = await authorizeEmployerPassword({
      email: randomEmail("y"),
      password: "x",
      ip: shared,
      now: T0,
    });
    expect(r).toMatchObject({ ok: false, code: "RATE_LIMITED" });
  });
});

describe("R-104 seeker OTP sign-in", () => {
  async function createSeeker(phone: string) {
    return db.user.create({
      data: { role: "SEEKER", phoneEnc: phone, phoneHash: phoneHashOf(phone) },
    });
  }

  async function sendCode(phone: string, code: string) {
    await requestOtp({
      phone,
      purpose: "LOGIN",
      locale: "ko",
      now: T0,
      notifier: captureNotifier(),
      code,
    });
  }

  it("signs in a SEEKER found by phoneHash with the right code (any phone format)", async () => {
    const phone = randomPhone();
    const user = await createSeeker(phone);
    await sendCode(phone, "246810");
    // "+8210xxxxxxxx" → "010-xxxx-xxxx"
    const local = `0${phone.slice(3, 5)}-${phone.slice(5, 9)}-${phone.slice(9)}`;
    const r = await authorizeSeekerOtp({
      phone: local,
      code: "246810",
      ip: ip(),
      now: plusSec(T0, 5),
    });
    expect(r).toEqual({
      ok: true,
      user: { id: user.id, role: "SEEKER", twoFactorVerified: false, totpEnrolled: false },
    });
  });

  it("maps OTP failures and refuses phones without a seeker account", async () => {
    const phone = randomPhone();
    await sendCode(phone, "135790");
    expect(await authorizeSeekerOtp({ phone, code: "000000", ip: ip(), now: T0 })).toMatchObject({
      ok: false,
      code: "OTP_INVALID",
      attemptsLeft: 4,
    });
    expect(await authorizeSeekerOtp({ phone, code: "135790", ip: ip(), now: T0 })).toEqual({
      ok: false,
      code: "NO_ACCOUNT",
    });
    expect(await authorizeSeekerOtp({ phone: "12", code: "135790", ip: ip() })).toEqual({
      ok: false,
      code: "INVALID_CREDENTIALS",
    });
  });

  it("R-104 / R-129: sendPhoneOtp validates the phone and applies the per-IP limit", async () => {
    expect(await sendPhoneOtp({ phone: "abc", purpose: "LOGIN", locale: "ko", ip: ip() })).toEqual({
      ok: false,
      code: "INVALID_PHONE",
    });
    const shared = ip();
    const send = () =>
      sendPhoneOtp({ phone: randomPhone(), purpose: "LOGIN", locale: "ko", ip: shared, now: T0 });
    for (let i = 0; i < RATE_LIMITS.otpRequestPerIp.limit; i++) {
      expect((await send()).ok).toBe(true);
    }
    expect(await send()).toMatchObject({ ok: false, code: "RATE_LIMITED" });
  });

  it("login identifiers never contain the raw phone or mixed-case e-mail", () => {
    const phone = randomPhone();
    expect(loginIdentifier("phone", phone)).toBe(`phone:${phoneHashOf(phone)}`);
    expect(loginIdentifier("phone", "nope")).toBeNull();
    expect(loginIdentifier("email", " A@B.test ")).toBe("email:a@b.test");
    expect(loginIdentifier("email", " ")).toBeNull();
  });
});
