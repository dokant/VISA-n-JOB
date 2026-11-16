/**
 * R-104: phone OTP — 60s resend limit, 5 per hour, lock on the 5th wrong code (fake clock).
 */
import { describe, expect, it } from "vitest";

import {
  OTP_LOCK_SEC,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_PER_HOUR,
  OTP_RESEND_INTERVAL_SEC,
  OTP_TTL_SEC,
} from "@/config/limits";
import { db } from "@/lib/db";
import { generateOtpCode, phoneHashOf, requestOtp, verifyOtp } from "@/lib/otp";

import { at, captureNotifier, plusSec, randomPhone } from "./authFixtures";

const T0 = at("2026-11-16T09:00:00.000Z");

function request(phone: string, now: Date, code = "123456") {
  const notifier = captureNotifier();
  return requestOtp({ phone, purpose: "LOGIN", locale: "ko", now, notifier, code }).then((r) => ({
    r,
    notifier,
  }));
}

describe("R-104 OTP", () => {
  it("generates zero-padded 6-digit codes", () => {
    for (let i = 0; i < 50; i++) expect(generateOtpCode()).toMatch(/^[0-9]{6}$/);
  });

  it("stores only hashes (phoneHash + codeHash), sends the code through the notifier", async () => {
    const phone = randomPhone();
    const { r, notifier } = await request(phone, T0, "654321");
    expect(r.ok).toBe(true);
    expect(notifier.sent).toHaveLength(1);
    expect(notifier.sent[0]).toMatchObject({
      channel: "SMS",
      to: phone,
      templateKey: "common.otp.sms",
      params: { code: "654321" },
    });
    const rows = await db.otpChallenge.findMany({ where: { phoneHash: phoneHashOf(phone) } });
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain(phone);
    expect(JSON.stringify(rows)).not.toContain("654321");
    expect(rows[0].expiresAt.getTime()).toBe(plusSec(T0, OTP_TTL_SEC).getTime());
  });

  it("R-104: a resend within 60 seconds is refused; after 60 seconds it is allowed", async () => {
    const phone = randomPhone();
    expect((await request(phone, T0)).r.ok).toBe(true);
    const early = await request(phone, plusSec(T0, OTP_RESEND_INTERVAL_SEC - 1));
    expect(early.r).toEqual({ ok: false, code: "RESEND_TOO_SOON", retryAfterSec: 1 });
    expect(early.notifier.sent).toHaveLength(0);
    expect((await request(phone, plusSec(T0, OTP_RESEND_INTERVAL_SEC))).r.ok).toBe(true);
  });

  it("R-104: more than 5 codes within an hour are refused until the hour has passed", async () => {
    const phone = randomPhone();
    for (let i = 0; i < OTP_MAX_PER_HOUR; i++) {
      const { r } = await request(phone, plusSec(T0, i * OTP_RESEND_INTERVAL_SEC));
      expect(r.ok).toBe(true);
    }
    const sixthAt = plusSec(T0, OTP_MAX_PER_HOUR * OTP_RESEND_INTERVAL_SEC);
    const sixth = await request(phone, sixthAt);
    expect(sixth.r.ok).toBe(false);
    if (!sixth.r.ok) {
      expect(sixth.r.code).toBe("HOURLY_LIMIT");
      // the oldest code in the window was sent at T0 → free again at T0 + 1h
      expect(sixth.r.retryAfterSec).toBe(3600 - OTP_MAX_PER_HOUR * OTP_RESEND_INTERVAL_SEC);
    }
    expect((await request(phone, plusSec(T0, 3600 + 1))).r.ok).toBe(true);
  });

  it("verifies the right code once; a used code cannot be reused", async () => {
    const phone = randomPhone();
    await request(phone, T0, "111222");
    const ok = await verifyOtp({ phone, code: "111222", purpose: "LOGIN", now: plusSec(T0, 10) });
    expect(ok).toEqual({ ok: true, phoneHash: phoneHashOf(phone) });
    const again = await verifyOtp({
      phone,
      code: "111222",
      purpose: "LOGIN",
      now: plusSec(T0, 11),
    });
    expect(again).toEqual({ ok: false, code: "NO_CHALLENGE" });
  });

  it("an expired code is refused; a new code replaces the previous one", async () => {
    const phone = randomPhone();
    await request(phone, T0, "333444");
    const late = await verifyOtp({
      phone,
      code: "333444",
      purpose: "LOGIN",
      now: plusSec(T0, OTP_TTL_SEC),
    });
    expect(late).toEqual({ ok: false, code: "EXPIRED" });

    const t1 = plusSec(T0, OTP_TTL_SEC + 1);
    await request(phone, t1, "555666");
    const old = await verifyOtp({ phone, code: "333444", purpose: "LOGIN", now: plusSec(t1, 5) });
    expect(old.ok).toBe(false);
    const fresh = await verifyOtp({ phone, code: "555666", purpose: "LOGIN", now: plusSec(t1, 6) });
    expect(fresh.ok).toBe(true);
  });

  it("R-104: the 5th wrong code locks the phone — even the right code and new requests are refused", async () => {
    const phone = randomPhone();
    await request(phone, T0, "777888");
    for (let i = 1; i < OTP_MAX_ATTEMPTS; i++) {
      const r = await verifyOtp({ phone, code: "000000", purpose: "LOGIN", now: plusSec(T0, i) });
      expect(r).toEqual({ ok: false, code: "INVALID_CODE", attemptsLeft: OTP_MAX_ATTEMPTS - i });
    }
    const fifth = await verifyOtp({
      phone,
      code: "000000",
      purpose: "LOGIN",
      now: plusSec(T0, OTP_MAX_ATTEMPTS),
    });
    expect(fifth).toEqual({ ok: false, code: "LOCKED", retryAfterSec: OTP_LOCK_SEC });

    const right = await verifyOtp({
      phone,
      code: "777888",
      purpose: "LOGIN",
      now: plusSec(T0, 20),
    });
    expect(right.ok).toBe(false);
    if (!right.ok) expect(right.code).toBe("LOCKED");

    const resend = await request(phone, plusSec(T0, 120));
    expect(resend.r.ok).toBe(false);
    if (!resend.r.ok) expect(resend.r.code).toBe("LOCKED");

    // the lock ends after OTP_LOCK_SEC
    const after = plusSec(T0, OTP_MAX_ATTEMPTS + OTP_LOCK_SEC + 1);
    expect((await request(phone, after, "121212")).r.ok).toBe(true);
    const ok = await verifyOtp({ phone, code: "121212", purpose: "LOGIN", now: plusSec(after, 1) });
    expect(ok.ok).toBe(true);
  });

  it("parallel requests for one phone send at most one code (advisory lock)", async () => {
    const phone = randomPhone();
    const results = await Promise.all(Array.from({ length: 4 }, () => request(phone, T0)));
    expect(results.filter((x) => x.r.ok)).toHaveLength(1);
  });
});
