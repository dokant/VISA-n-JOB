/**
 * R-210 / WO §11: signed file URLs expire after SIGNED_URL_TTL_SEC (5 minutes) and any change to
 * the token is refused. The clock is injected (`now`), so the expiry edge is tested exactly.
 */
import { describe, expect, it } from "vitest";

import { SIGNED_URL_TTL_SEC } from "@/config/limits";
import { signFileToken, signedFileUrl, verifyFileToken } from "@/lib/files/signedUrl";

const KEY = "intro-confirm/cmabc12345/123e4567-e89b-42d3-a456-426614174000.pdf";
const T0 = new Date("2026-11-18T01:00:00.000Z");
const at = (sec: number) => new Date(T0.getTime() + sec * 1000);

function sign(now = T0) {
  return signFileToken({ key: KEY, userId: "staff-1", purpose: "INTRO_CONFIRM" }, now);
}

describe("R-210 signed file URLs", () => {
  it("R-210: the URL lasts exactly SIGNED_URL_TTL_SEC (5 minutes) with an injected clock", () => {
    expect(SIGNED_URL_TTL_SEC).toBe(300);
    const token = sign();
    const ok = verifyFileToken(token, at(0));
    expect(ok).toEqual({
      ok: true,
      payload: { k: KEY, e: T0.getTime() / 1000 + 300, u: "staff-1", p: "INTRO_CONFIRM" },
    });
    expect(verifyFileToken(token, at(SIGNED_URL_TTL_SEC - 1)).ok).toBe(true);
    expect(verifyFileToken(token, at(SIGNED_URL_TTL_SEC))).toEqual({
      ok: false,
      reason: "EXPIRED",
    });
    expect(verifyFileToken(token, at(3600))).toEqual({ ok: false, reason: "EXPIRED" });
  });

  it("R-210: a changed payload, signature or format is refused", () => {
    const token = sign();
    const [body, sig] = token.split(".");
    // a longer expiry written into the payload without re-signing
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      e: number;
    };
    const forged = Buffer.from(JSON.stringify({ ...payload, e: payload.e + 86_400 })).toString(
      "base64url",
    );
    expect(verifyFileToken(`${forged}.${sig}`, at(1))).toEqual({
      ok: false,
      reason: "BAD_SIGNATURE",
    });
    const flipped = sig.slice(0, -1) + (sig.endsWith("A") ? "B" : "A");
    expect(verifyFileToken(`${body}.${flipped}`, at(1))).toEqual({
      ok: false,
      reason: "BAD_SIGNATURE",
    });
    for (const bad of ["", "abc", `${body}`, `${body}.${sig}.x`, "../../etc/passwd"]) {
      expect(verifyFileToken(bad, at(1))).toEqual({ ok: false, reason: "MALFORMED" });
    }
  });

  it("R-210: only generated storage keys can be signed (no paths from outside)", () => {
    for (const key of ["../secret.pdf", "/etc/passwd", "intro-confirm/x/../../a.pdf", "a.pdf"]) {
      expect(() =>
        signFileToken({ key, userId: "staff-1", purpose: "INTRO_CONFIRM" }, T0),
      ).toThrow();
    }
    expect(signedFileUrl({ key: KEY, userId: "u", purpose: "INTRO_CONFIRM" }, T0)).toMatch(
      /^\/api\/files\/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/,
    );
  });
});
