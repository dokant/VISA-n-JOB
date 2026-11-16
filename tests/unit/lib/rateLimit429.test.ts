/**
 * R-129 마무리 (PLAN P1d 작업 6): "한도 초과 시 429" for the three limited entry points together —
 * OTP request (/api/seeker/otp), sign-in (/api/auth/callback/*), collector API (/api/ingest/job-leads).
 * Each bucket is filled through the same rateLimit.ts functions the routes use; one fixed clock keeps
 * the filling and the request in the same window.
 */
import { randomBytes } from "node:crypto";

import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { RATE_LIMITS } from "@/config/limits";
import { loginIdentifier, loginRateLimitKeys } from "@/lib/authCredentials";
import { consumeRateLimit, rateLimitSubject } from "@/lib/rateLimit";

import { randomPhone } from "./authFixtures";

const authPost = vi.fn(async () => new Response(null, { status: 302 }));
vi.mock("@/auth", () => ({ handlers: { GET: vi.fn(), POST: authPost } }));

const { POST: otpPost } = await import("@/app/api/seeker/otp/route");
const { POST: loginPost } = await import("@/app/api/auth/[...nextauth]/route");
const { POST: ingestPost } = await import("@/app/api/ingest/job-leads/route");

const KEY = randomBytes(32).toString("base64url");

beforeAll(() => {
  process.env.TRUST_PROXY = "true";
  process.env.INGEST_API_KEY = KEY;
});
afterAll(() => {
  delete process.env.TRUST_PROXY;
  delete process.env.INGEST_API_KEY;
});
afterEach(() => {
  vi.useRealTimers();
});

function freezeClock() {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-16T06:00:05Z"));
}

async function fill(key: string, rule: { limit: number; windowSec: number }) {
  for (let i = 0; i < rule.limit; i++) await consumeRateLimit(key, rule);
}

async function expect429(res: Response, code: string) {
  expect(res.status).toBe(429);
  expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
  expect(((await res.json()) as { error: { code: string } }).error.code).toBe(code);
}

describe("R-129 429 on all three limited entry points", () => {
  it("R-129 OTP: one client address over otpRequestPerIp → 429 RATE_LIMITED", async () => {
    freezeClock();
    const ip = `203.0.113.${Date.now() % 250}-${randomBytes(4).toString("hex")}`;
    await fill(`otp:ip:${rateLimitSubject(ip)}`, RATE_LIMITS.otpRequestPerIp);
    const res = await otpPost(
      new NextRequest("http://127.0.0.1/api/seeker/otp", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": ip },
        body: JSON.stringify({ phone: randomPhone() }),
      }),
    );
    await expect429(res, "RATE_LIMITED");
  });

  it("R-129 login: an account over loginPerIdentifier → 429 before Auth.js", async () => {
    freezeClock();
    const email = `r129-${randomBytes(4).toString("hex")}@example.test`;
    const ip = `198.51.100.9-${randomBytes(4).toString("hex")}`;
    const [account] = loginRateLimitKeys(loginIdentifier("email", email) as string, ip);
    await fill(account.key, account.rule);
    const calls = authPost.mock.calls.length;
    const res = await loginPost(
      new NextRequest("http://127.0.0.1/api/auth/callback/employer-password", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", "x-forwarded-for": ip },
        body: new URLSearchParams({ email, password: "x" }).toString(),
      }),
    );
    await expect429(res, "RATE_LIMITED");
    expect(authPost.mock.calls.length).toBe(calls);
  });

  it("R-129 ingest: per client address (before the key check) and per key → 429", async () => {
    freezeClock();
    const ip = `192.0.2.33-${randomBytes(4).toString("hex")}`;
    await fill(`ingest:ip:${rateLimitSubject(ip)}`, RATE_LIMITS.ingestPerIp);
    const byIp = await ingestPost(
      new NextRequest("http://127.0.0.1/api/ingest/job-leads", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": ip },
        body: "[]",
      }),
    );
    await expect429(byIp, "RATE_LIMITED");

    await fill(`ingest:key:${rateLimitSubject(KEY)}`, RATE_LIMITS.ingestPerKey);
    const byKey = await ingestPost(
      new NextRequest("http://127.0.0.1/api/ingest/job-leads", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": KEY },
        body: "[]",
      }),
    );
    await expect429(byKey, "RATE_LIMITED");
  });
});
