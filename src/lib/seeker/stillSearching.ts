/**
 * "아직 구직 중이세요?" one-click answer (PRD R-213, WO §7.7 30일 주기 상태 확인).
 *
 * The 30-day status check (src/lib/jobs/statusCheck.ts) sends a link
 * `/{locale}/seeker/still-searching/{token}`. The token is signed, not stored:
 *   token = base64url(JSON { s: seekerId, t: sentAt ms, e: expiry unix s }) + "~" + HMAC-SHA256 ("~", not ".": a path with a dot skips the middleware matcher)
 *   (crypto.hmacSign, purpose "still-searching", key derived from HASH_KEY).
 * - It is valid until `sentAt + STATUS_CHECK_REPLY_DAYS` (the same 14 days after which the seeker
 *   becomes INACTIVE), and only for the check it was sent with: the seeker's `statusCheckSentAt`
 *   must still equal `t`. Answering clears `statusCheckSentAt`, so a token works once.
 * - Opening the page never changes anything (mail scanners open links); the seeker presses the
 *   button, which calls `confirmStillSearching`.
 * - The token carries the profile id only — no name, phone or other personal data.
 * The clock is injected (`now`) so tests can move time.
 */
import { STATUS_CHECK_REPLY_DAYS } from "@/config/limits";
import { hmacSign, signaturesEqual } from "@/lib/crypto";
import { db } from "@/lib/db";

type Client = typeof db;

const SIGN_PURPOSE = "still-searching";
const DAY_MS = 86_400_000;
const TOKEN = /^[A-Za-z0-9_-]{10,400}~[A-Za-z0-9_-]{43}$/;

export type StillSearchingPayload = { s: string; t: number; e: number };

export function signStillSearchingToken(seekerId: string, sentAt: Date): string {
  const payload: StillSearchingPayload = {
    s: seekerId,
    t: sentAt.getTime(),
    e: Math.floor((sentAt.getTime() + STATUS_CHECK_REPLY_DAYS * DAY_MS) / 1000),
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}~${hmacSign(SIGN_PURPOSE, body)}`;
}

/** Path of the answer page (the job prefixes the site origin). */
export function stillSearchingPath(locale: string, token: string): string {
  return `/${locale}/seeker/still-searching/${token}`;
}

export type TokenCheck =
  | { ok: true; payload: StillSearchingPayload }
  | { ok: false; reason: "MALFORMED" | "BAD_SIGNATURE" | "EXPIRED" };

function isPayload(v: unknown): v is StillSearchingPayload {
  if (v === null || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.s === "string" &&
    o.s.length > 0 &&
    o.s.length <= 64 &&
    Number.isInteger(o.t) &&
    Number.isInteger(o.e)
  );
}

export function verifyStillSearchingToken(token: string, now: Date = new Date()): TokenCheck {
  if (typeof token !== "string" || !TOKEN.test(token)) return { ok: false, reason: "MALFORMED" };
  const [body, signature] = token.split("~");
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

/**
 * What the answer page shows for a token:
 * - ASK: valid and the check is still open → show the "아직 구직 중입니다" button;
 * - ANSWERED: already answered (or a newer check replaced this one);
 * - EXPIRED: past the 14 days, or the seeker is no longer active;
 * - INVALID: not a token of ours.
 */
export type StillSearchingState = "ASK" | "ANSWERED" | "EXPIRED" | "INVALID";

export async function stillSearchingState(
  token: string,
  now: Date = new Date(),
  client: Client = db,
): Promise<StillSearchingState> {
  const check = verifyStillSearchingToken(token, now);
  if (!check.ok) return check.reason === "EXPIRED" ? "EXPIRED" : "INVALID";
  const seeker = await client.seekerProfile.findUnique({
    where: { id: check.payload.s },
    select: { status: true, statusCheckSentAt: true, lastActiveConfirmedAt: true },
  });
  if (!seeker) return "INVALID";
  if (seeker.statusCheckSentAt?.getTime() === check.payload.t) {
    return seeker.status === "ACTIVE" ? "ASK" : "EXPIRED";
  }
  return seeker.lastActiveConfirmedAt.getTime() >= check.payload.t ? "ANSWERED" : "EXPIRED";
}

export type ConfirmResult =
  { ok: true } | { ok: false; state: Exclude<StillSearchingState, "ASK"> };

/**
 * The seeker answered "아직 구직 중입니다": `lastActiveConfirmedAt = now`, the open check is closed.
 * Guarded on the same `statusCheckSentAt` and ACTIVE status, so a double click or a late answer
 * after the 14-day job changes nothing.
 */
export async function confirmStillSearching(
  token: string,
  now: Date = new Date(),
  client: Client = db,
): Promise<ConfirmResult> {
  const check = verifyStillSearchingToken(token, now);
  if (!check.ok) return { ok: false, state: check.reason === "EXPIRED" ? "EXPIRED" : "INVALID" };
  const r = await client.seekerProfile.updateMany({
    where: { id: check.payload.s, status: "ACTIVE", statusCheckSentAt: new Date(check.payload.t) },
    data: { lastActiveConfirmedAt: now, statusCheckSentAt: null, statusCheckDeliveredReal: false },
  });
  if (r.count === 1) return { ok: true };
  const state = await stillSearchingState(token, now, client);
  return { ok: false, state: state === "ASK" ? "EXPIRED" : state };
}
