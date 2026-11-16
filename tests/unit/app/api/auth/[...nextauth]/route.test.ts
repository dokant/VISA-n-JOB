/**
 * R-129: the Auth.js credentials callback answers 429 once the login limit is reached, before the
 * request reaches Auth.js (which is mocked here).
 */
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { RATE_LIMITS } from "@/config/limits";
import { loginIdentifier, loginRateLimitKeys } from "@/lib/authCredentials";
import { consumeRateLimit } from "@/lib/rateLimit";

const authPost = vi.fn(async () => new Response(null, { status: 302 }));
vi.mock("@/auth", () => ({ handlers: { GET: vi.fn(), POST: authPost } }));

const { POST } = await import("@/app/api/auth/[...nextauth]/route");

function callback(provider: string, fields: Record<string, string>, ip: string) {
  return new NextRequest(`http://127.0.0.1/api/auth/callback/${provider}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "x-forwarded-for": ip },
    body: new URLSearchParams(fields).toString(),
  });
}

describe("R-129 /api/auth/callback rate limit", () => {
  it("passes requests through while under the limit, 429 once the e-mail is over it", async () => {
    const email = `limited-${Date.now()}@example.test`;
    const ip = `192.0.2.200-${Date.now()}`;
    const ok = await POST(callback("employer-password", { email, password: "x" }, ip));
    expect(ok.status).toBe(302);
    expect(authPost).toHaveBeenCalledTimes(1);

    const identifier = loginIdentifier("email", email) as string;
    const [idKey] = loginRateLimitKeys(identifier, ip);
    for (let i = 0; i < RATE_LIMITS.loginPerIdentifier.limit; i++) {
      await consumeRateLimit(idKey.key, idKey.rule);
    }
    const limited = await POST(
      callback("employer-password", { email: email.toUpperCase(), password: "x" }, ip),
    );
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toMatch(/^[0-9]+$/);
    expect(await limited.json()).toEqual({
      error: { code: "RATE_LIMITED", message: "too many sign-in attempts" },
    });
    expect(authPost).toHaveBeenCalledTimes(1);
  });

  it("checks seeker sign-ins by hashed phone", async () => {
    const phone = `+8210${String(Date.now()).slice(-8)}`;
    const ip = `192.0.2.201-${Date.now()}`;
    const identifier = loginIdentifier("phone", phone) as string;
    const [idKey] = loginRateLimitKeys(identifier, ip);
    for (let i = 0; i < RATE_LIMITS.loginPerIdentifier.limit; i++) {
      await consumeRateLimit(idKey.key, idKey.rule);
    }
    const res = await POST(callback("seeker-otp", { phone, code: "123456" }, ip));
    expect(res.status).toBe(429);
  });

  it("other Auth.js POSTs (sign-out, session) are not touched", async () => {
    const res = await POST(
      new NextRequest("http://127.0.0.1/api/auth/signout", { method: "POST", body: "" }),
    );
    expect(res.status).toBe(302);
  });
});
