/**
 * R-129 (OTP·로그인 부분): fixed-window limits in Postgres (RateLimitBucket), fake clock.
 */
import { describe, expect, it } from "vitest";

import {
  clientIp,
  consumeAll,
  consumeRateLimit,
  peekRateLimit,
  rateLimitSubject,
  windowStartOf,
} from "@/lib/rateLimit";

import { uniq } from "../db/helpers";
import { at, plusSec } from "./authFixtures";

const RULE = { limit: 3, windowSec: 60 };
const T0 = at("2026-11-16T10:00:00.000Z");

describe("R-129 rate limit", () => {
  it("windows are aligned fixed windows", () => {
    expect(windowStartOf(at("2026-11-16T10:00:59.999Z"), 60).toISOString()).toBe(
      "2026-11-16T10:00:00.000Z",
    );
    expect(windowStartOf(at("2026-11-16T10:01:00.000Z"), 60).toISOString()).toBe(
      "2026-11-16T10:01:00.000Z",
    );
  });

  it("allows `limit` hits per window, refuses the next with Retry-After, resets next window", async () => {
    const key = uniq("rl");
    for (let i = 0; i < RULE.limit; i++) {
      expect(await consumeRateLimit(key, RULE, plusSec(T0, i))).toEqual({
        ok: true,
        remaining: RULE.limit - 1 - i,
      });
    }
    expect(await consumeRateLimit(key, RULE, plusSec(T0, 10))).toEqual({
      ok: false,
      retryAfterSec: 50,
    });
    expect(await peekRateLimit(key, RULE, plusSec(T0, 11))).toEqual({
      ok: false,
      retryAfterSec: 49,
    });
    expect((await consumeRateLimit(key, RULE, plusSec(T0, 60))).ok).toBe(true);
  });

  it("peek does not count", async () => {
    const key = uniq("rl");
    for (let i = 0; i < 5; i++) expect((await peekRateLimit(key, RULE, T0)).ok).toBe(true);
    expect(await consumeRateLimit(key, RULE, T0)).toEqual({ ok: true, remaining: 2 });
  });

  it("parallel hits never exceed the limit (atomic upsert)", async () => {
    const key = uniq("rl");
    const results = await Promise.all(
      Array.from({ length: 10 }, () => consumeRateLimit(key, RULE, T0)),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(RULE.limit);
  });

  it("consumeAll stops at the first exceeded rule", async () => {
    const a = uniq("rl-a");
    const b = uniq("rl-b");
    const tight = { limit: 1, windowSec: 60 };
    expect(
      (
        await consumeAll(
          [
            { key: a, rule: RULE },
            { key: b, rule: tight },
          ],
          T0,
        )
      ).ok,
    ).toBe(true);
    const second = await consumeAll(
      [
        { key: a, rule: RULE },
        { key: b, rule: tight },
      ],
      T0,
    );
    expect(second.ok).toBe(false);
  });

  it("subjects are hashes; client IP comes from proxy headers", () => {
    expect(rateLimitSubject("203.0.113.9")).toMatch(/^[0-9a-f]{32}$/);
    expect(rateLimitSubject("203.0.113.9")).not.toContain("203");
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }))).toBe(
      "203.0.113.9",
    );
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
