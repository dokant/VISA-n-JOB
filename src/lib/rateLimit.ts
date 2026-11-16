/**
 * Fixed-window rate limiting in Postgres (PRD R-129 OTP·로그인 부분, PLAN P1b-3; no Redis — PLAN
 * "쓰지 않는 것"). One `RateLimitBucket` row per (key, window start); the counter is bumped with a
 * single `INSERT … ON CONFLICT DO UPDATE … RETURNING`, so concurrent requests cannot both pass the
 * last free slot.
 *
 * Keys look like `<scope>:<subject>`. The subject is always a hash or an IP address — never a raw
 * phone number or e-mail (STANDARD 4.7). Callers pass `now` so tests use a fake clock.
 */
import { createHash } from "node:crypto";

import { db } from "./db";

export type RateLimitRule = { readonly limit: number; readonly windowSec: number };

export type RateLimitResult =
  { ok: true; remaining: number } | { ok: false; retryAfterSec: number };

/** Anything with `$queryRaw` — the app `db`, a test client or a transaction client. */
type RawClient = Pick<typeof db, "$queryRaw">;

export function windowStartOf(now: Date, windowSec: number): Date {
  const ms = windowSec * 1000;
  return new Date(Math.floor(now.getTime() / ms) * ms);
}

function retryAfter(now: Date, windowSec: number): number {
  const end = windowStartOf(now, windowSec).getTime() + windowSec * 1000;
  return Math.max(1, Math.ceil((end - now.getTime()) / 1000));
}

/** Short non-reversible subject for keys (IP addresses, normalised identifiers). */
export function rateLimitSubject(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex").slice(0, 32);
}

/** Counts one hit. Returns `ok: false` once the window already holds `limit` hits. */
export async function consumeRateLimit(
  key: string,
  rule: RateLimitRule,
  now: Date = new Date(),
  client: RawClient = db,
): Promise<RateLimitResult> {
  const windowStart = windowStartOf(now, rule.windowSec);
  const rows = await client.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "RateLimitBucket" ("key", "windowStart", "count", "updatedAt")
    VALUES (${key}, ${windowStart}, 1, ${now})
    ON CONFLICT ("key", "windowStart")
    DO UPDATE SET "count" = "RateLimitBucket"."count" + 1, "updatedAt" = ${now}
    RETURNING "count"`;
  const count = Number(rows[0]?.count ?? 0);
  if (count > rule.limit) return { ok: false, retryAfterSec: retryAfter(now, rule.windowSec) };
  return { ok: true, remaining: rule.limit - count };
}

/** Reads the current window without counting (used before handing a request to Auth.js). */
export async function peekRateLimit(
  key: string,
  rule: RateLimitRule,
  now: Date = new Date(),
  client: RawClient = db,
): Promise<RateLimitResult> {
  const windowStart = windowStartOf(now, rule.windowSec);
  const rows = await client.$queryRaw<Array<{ count: number }>>`
    SELECT "count" FROM "RateLimitBucket" WHERE "key" = ${key} AND "windowStart" = ${windowStart}`;
  const count = Number(rows[0]?.count ?? 0);
  if (count >= rule.limit) return { ok: false, retryAfterSec: retryAfter(now, rule.windowSec) };
  return { ok: true, remaining: rule.limit - count };
}

/** Consumes several limits; stops at the first one that is exceeded. */
export async function consumeAll(
  entries: ReadonlyArray<{ key: string; rule: RateLimitRule }>,
  now: Date = new Date(),
  client: RawClient = db,
): Promise<RateLimitResult> {
  let remaining = Number.POSITIVE_INFINITY;
  for (const { key, rule } of entries) {
    const r = await consumeRateLimit(key, rule, now, client);
    if (!r.ok) return r;
    remaining = Math.min(remaining, r.remaining);
  }
  return { ok: true, remaining };
}

/** Client address from proxy headers; "unknown" when absent (local tests). Never logged. */
export function clientIp(headers: Pick<Headers, "get">): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}
