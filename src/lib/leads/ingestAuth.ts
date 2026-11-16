/**
 * Collector API key check for POST /api/ingest/job-leads (R-114, STANDARD 4.5 공개 예외 + key).
 *
 * The key comes from the INGEST_API_KEY environment variable (never from code or the database).
 * Comparison is constant-time: both values are hashed to the same length and compared with
 * `timingSafeEqual`, so neither the length nor a matching prefix leaks through response timing.
 * An unset or short server key (< INGEST_API_KEY_MIN_LENGTH) rejects every request (fail closed).
 */
import { createHash, timingSafeEqual } from "node:crypto";

import { INGEST_API_KEY_MIN_LENGTH } from "@/config/limits";

type Env = Readonly<Record<string, string | undefined>>;

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function isValidIngestKey(provided: string | null, env: Env = process.env): boolean {
  const expected = env.INGEST_API_KEY ?? "";
  if (expected.length < INGEST_API_KEY_MIN_LENGTH || !provided) return false;
  return timingSafeEqual(digest(provided), digest(expected));
}
