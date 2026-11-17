/**
 * Signed file URLs (PRD R-210, WO §11 "서명 URL은 5분 만료").
 *
 * token = base64url(JSON payload) + "." + HMAC-SHA256(payload) (crypto.hmacSign, purpose
 * "file-url", key derived from HASH_KEY). The payload names:
 * - `k`  the storage key (src/lib/files/storage.ts),
 * - `e`  the expiry (unix seconds) = issue time + SIGNED_URL_TTL_SEC,
 * - `u`  the user the URL was issued to — the file route serves it to that signed-in user only,
 * - `p`  the purpose (`INTRO_CONFIRM`), so a token cannot be replayed for another kind of file.
 * `verifyFileToken` returns a reason instead of throwing; the route answers 403 for every reason
 * (expired, bad signature, malformed). The clock is injected (`now`) so tests can move time.
 */
import { SIGNED_URL_TTL_SEC } from "@/config/limits";
import { hmacSign, signaturesEqual } from "@/lib/crypto";

import { isStorageKey } from "./storage";

export const FILE_URL_PURPOSES = ["INTRO_CONFIRM"] as const;
export type FileUrlPurpose = (typeof FILE_URL_PURPOSES)[number];

export type FileTokenPayload = { k: string; e: number; u: string; p: FileUrlPurpose };

const SIGN_PURPOSE = "file-url";
const TOKEN = /^[A-Za-z0-9_-]{10,2000}\.[A-Za-z0-9_-]{43}$/;

export function signFileToken(
  args: { key: string; userId: string; purpose: FileUrlPurpose },
  now: Date = new Date(),
): string {
  if (!isStorageKey(args.key)) throw new Error("signedUrl: invalid storage key");
  const payload: FileTokenPayload = {
    k: args.key,
    e: Math.floor(now.getTime() / 1000) + SIGNED_URL_TTL_SEC,
    u: args.userId,
    p: args.purpose,
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${hmacSign(SIGN_PURPOSE, body)}`;
}

/** `/api/files/{token}` */
export function signedFileUrl(
  args: { key: string; userId: string; purpose: FileUrlPurpose },
  now: Date = new Date(),
): string {
  return `/api/files/${signFileToken(args, now)}`;
}

export type VerifyResult =
  | { ok: true; payload: FileTokenPayload }
  | { ok: false; reason: "MALFORMED" | "BAD_SIGNATURE" | "EXPIRED" };

export function verifyFileToken(token: string, now: Date = new Date()): VerifyResult {
  if (typeof token !== "string" || !TOKEN.test(token)) return { ok: false, reason: "MALFORMED" };
  const [body, signature] = token.split(".");
  if (!signaturesEqual(signature, hmacSign(SIGN_PURPOSE, body))) {
    return { ok: false, reason: "BAD_SIGNATURE" };
  }
  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "MALFORMED" };
  }
  if (!isPayload(payload)) return { ok: false, reason: "MALFORMED" };
  if (Math.floor(now.getTime() / 1000) >= payload.e) return { ok: false, reason: "EXPIRED" };
  return { ok: true, payload };
}

function isPayload(v: unknown): v is FileTokenPayload {
  if (v === null || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    isStorageKey(o.k) &&
    typeof o.e === "number" &&
    Number.isInteger(o.e) &&
    typeof o.u === "string" &&
    o.u.length > 0 &&
    typeof o.p === "string" &&
    (FILE_URL_PURPOSES as readonly string[]).includes(o.p)
  );
}
