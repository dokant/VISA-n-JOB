/**
 * Collector API key check for POST /api/ingest/job-leads (R-114, STANDARD 4.5 공개 예외 + key).
 *
 * The key comes from the INGEST_API_KEY environment variable (never from code or the database).
 * Comparison is constant-time: both values are hashed to the same length and compared with
 * `timingSafeEqual`, so neither the length nor a matching prefix leaks through response timing.
 * An unset or short server key rejects every request (fail closed).
 */
import { createHash, timingSafeEqual } from "node:crypto";

/** Server keys shorter than this are treated as unset. */
const MIN_KEY_LENGTH = 32;

type Env = Readonly<Record<string, string | undefined>>;

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function isValidIngestKey(provided: string | null, env: Env = process.env): boolean {
  const expected = env.INGEST_API_KEY ?? "";
  if (expected.length < MIN_KEY_LENGTH || !provided) return false;
  return timingSafeEqual(digest(provided), digest(expected));
}
