import { type NextRequest, NextResponse } from "next/server";

import { RATE_LIMITS } from "@/config/limits";
import { ingestJobLeads } from "@/lib/leads/ingest";
import { isValidIngestKey } from "@/lib/leads/ingestAuth";
import { clientIp, consumeRateLimit, rateLimitSubject } from "@/lib/rateLimit";
import { ingestBatchSchema } from "@/schemas/ingest/jobLead";

/**
 * POST /api/ingest/job-leads — collector agent entry (R-114, R-115, R-129, WO §8.1, STANDARD 5).
 *
 * Header `x-api-key` (INGEST_API_KEY). Body: JSON array of 1 ~ INGEST_MAX_BATCH leads.
 * 200 `{ created, updated, rejected: [{ sourceRef, reason }] }` · 400 VALIDATION / BATCH_TOO_LARGE ·
 * 401 UNAUTHENTICATED · 429 RATE_LIMITED with `Retry-After`.
 */
export const dynamic = "force-dynamic";

function error(status: number, code: string, message: string, retryAfterSec?: number) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: retryAfterSec ? { "Retry-After": String(retryAfterSec) } : undefined },
  );
}

export async function POST(request: NextRequest) {
  // rbac: public — 수집 API (STANDARD 4.5 공개 예외 `/api/ingest/*`), 인증은 x-api-key 상수시간 비교
  const now = new Date();
  const ip = clientIp(request.headers);
  if (ip) {
    const r = await consumeRateLimit(
      `ingest:ip:${rateLimitSubject(ip)}`,
      RATE_LIMITS.ingestPerIp,
      now,
    );
    if (!r.ok) return error(429, "RATE_LIMITED", "too many requests", r.retryAfterSec);
  }

  const key = request.headers.get("x-api-key");
  if (!isValidIngestKey(key)) return error(401, "UNAUTHENTICATED", "missing or invalid API key");

  const limited = await consumeRateLimit(
    `ingest:key:${rateLimitSubject(key as string)}`,
    RATE_LIMITS.ingestPerKey,
    now,
  );
  if (!limited.ok) return error(429, "RATE_LIMITED", "too many requests", limited.retryAfterSec);

  const json: unknown = await request.json().catch(() => undefined);
  if (!Array.isArray(json)) return error(400, "VALIDATION", "body must be a JSON array");
  const batch = ingestBatchSchema.safeParse(json);
  if (!batch.success) {
    return json.length === 0
      ? error(400, "VALIDATION", "body must not be empty")
      : error(400, "BATCH_TOO_LARGE", "too many items in one batch");
  }

  const result = await ingestJobLeads(batch.data, now);
  return NextResponse.json(result, { status: 200 });
}
