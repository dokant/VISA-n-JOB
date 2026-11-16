/**
 * R-104 / R-129: POST /api/seeker/otp answers 429 (STANDARD 5 error format) when a limit is hit.
 */
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { OTP_RESEND_INTERVAL_SEC } from "@/config/limits";
import { POST } from "@/app/api/seeker/otp/route";

import { randomPhone } from "../../../../lib/authFixtures";

let n = 0;
function post(body: unknown, ip = `198.51.100.${++n}-${Date.now()}`) {
  return POST(
    new NextRequest("http://127.0.0.1/api/seeker/otp", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    }),
  );
}

describe("R-129 POST /api/seeker/otp", () => {
  // Per-IP limits use X-Forwarded-For only behind a trusted proxy (P1b QA O-1).
  beforeAll(() => {
    process.env.TRUST_PROXY = "true";
  });
  afterAll(() => {
    delete process.env.TRUST_PROXY;
  });

  it("200 then 429 RESEND_TOO_SOON with Retry-After for the same phone", async () => {
    const phone = randomPhone();
    const first = await post({ phone, locale: "vi" });
    expect(first.status).toBe(200);
    const body = (await first.json()) as { resendAvailableAt: string };
    expect(Date.parse(body.resendAvailableAt)).toBeGreaterThan(Date.now());

    const second = await post({ phone });
    expect(second.status).toBe(429);
    expect(await second.json()).toEqual({
      error: { code: "RESEND_TOO_SOON", message: "too many OTP requests" },
    });
    const retry = Number(second.headers.get("Retry-After"));
    expect(retry).toBeGreaterThan(0);
    expect(retry).toBeLessThanOrEqual(OTP_RESEND_INTERVAL_SEC);
  });

  it("400 for a missing or invalid phone", async () => {
    expect((await post({})).status).toBe(400);
    expect((await post({ phone: "hello" })).status).toBe(400);
    const res = await post({ phone: "hello" });
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("VALIDATION");
  });

  it("429 RATE_LIMITED once one IP has asked for too many codes", async () => {
    const ip = `203.0.113.77-${Date.now()}`;
    let last: Response | null = null;
    for (let i = 0; i < 25; i++) last = await post({ phone: randomPhone() }, ip);
    expect(last?.status).toBe(429);
    expect(((await last?.json()) as { error: { code: string } }).error.code).toBe("RATE_LIMITED");
  });

  it("O-1: without TRUST_PROXY a spoofed X-Forwarded-For is ignored (no per-IP limit)", async () => {
    delete process.env.TRUST_PROXY;
    try {
      const ip = `203.0.113.78-${Date.now()}`;
      for (let i = 0; i < 25; i++) {
        expect((await post({ phone: randomPhone() }, ip)).status).toBe(200);
      }
    } finally {
      process.env.TRUST_PROXY = "true";
    }
  });
});
