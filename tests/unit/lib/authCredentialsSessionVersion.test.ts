/**
 * R-118 (staff), R-104 (seeker), R-123 (employer) sessions — integration QA I-1 / Q-29 (STANDARD
 * 4.11). Cross test of `authCredentials` (session version, absolute lifetime), `authConfig`
 * (middleware claims) and `admin/session` (/admin/login check). A token carries the account's
 * `sessionVersion` (claim `sv`); sign-out raises it and every older token is refused. Every session
 * ends at `authTime` + the role's lifetime however often it is used. The middleware only reads the
 * claims (no refresh, no Set-Cookie).
 */
import { encode } from "next-auth/jwt";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { SESSION_MAX_AGE_SEC, STAFF_SESSION_MAX_AGE_SEC } from "@/config/limits";
import {
  applySessionVersion,
  isSessionCurrent,
  isSessionExpired,
  revokeSessions,
  sessionMaxAgeSecOf,
  sessionVersionOf,
} from "@/lib/authCredentials";
import { readSessionClaims } from "@/lib/authConfig";
import { db } from "@/lib/db";

import { randomEmail } from "./authFixtures";

// `auth()` of src/auth.ts runs `applySessionVersion` in its JWT callback; here the resulting
// session (or null for a signed-out token) is set directly.
const current = vi.hoisted(() => ({ session: null as unknown }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => current.session) }));
const { hasVerifiedStaffSession } = await import("@/lib/admin/session");

const SECRET = "test-secret-test-secret-test-secret-0123";

beforeAll(() => {
  process.env.AUTH_SECRET = SECRET;
});

const nowSec = () => Math.floor(Date.now() / 1000);

async function createUser(role: "ADMIN" | "EMPLOYER" | "SEEKER") {
  return db.user.create({ data: { role, email: randomEmail(`sv-${role.toLowerCase()}`) } });
}

describe("R-118 R-104 R-123 I-1 session version", () => {
  it("a new account starts at version 0; unknown accounts have none", async () => {
    const user = await createUser("SEEKER");
    expect(await sessionVersionOf(user.id)).toBe(0);
    expect(await sessionVersionOf("no-such-user")).toBeNull();
  });

  it("isSessionCurrent: only an exact numeric match with an existing account", () => {
    expect(isSessionCurrent(0, 0)).toBe(true);
    expect(isSessionCurrent(3, 3)).toBe(true);
    expect(isSessionCurrent(2, 3)).toBe(false);
    expect(isSessionCurrent(undefined, 0)).toBe(false);
    expect(isSessionCurrent("0", 0)).toBe(false);
    expect(isSessionCurrent(0, null)).toBe(false);
  });

  it("sign-in stamps the current version; the same token is accepted until sign-out", async () => {
    const user = await createUser("ADMIN");
    await db.user.update({ where: { id: user.id }, data: { sessionVersion: 4 } });
    const token = await applySessionVersion(
      { sub: user.id, role: "ADMIN" as const, authTime: nowSec() },
      true,
    );
    expect(token).toMatchObject({ sub: user.id, sv: 4 });
    expect(await applySessionVersion({ ...token }, false)).toMatchObject({ sv: 4 });
  });

  it("refuses a token whose version differs from the database (signed out), has none, or lost its account", async () => {
    const user = await createUser("EMPLOYER");
    const authTime = nowSec();
    expect(await applySessionVersion({ sub: user.id, sv: 0, authTime }, false)).not.toBeNull();
    expect(await applySessionVersion({ sub: user.id, sv: 1, authTime }, false)).toBeNull();
    expect(await applySessionVersion({ sub: user.id, authTime }, false)).toBeNull();
    expect(await applySessionVersion({ sub: "no-such-user", sv: 0, authTime }, false)).toBeNull();
    expect(await applySessionVersion({ sub: "no-such-user", authTime }, true)).toBeNull();
    expect(await applySessionVersion({ sv: 0, authTime }, false)).toBeNull();
  });

  it("sign-out raises the version once, so the signed-out token (and every copy) is refused", async () => {
    for (const role of ["ADMIN", "EMPLOYER", "SEEKER"] as const) {
      const user = await createUser(role);
      const token = await applySessionVersion({ sub: user.id, role, authTime: nowSec() }, true);
      expect(token?.sv).toBe(0);
      const copy = { ...token };

      expect(await revokeSessions(token)).toBe(true);
      expect(await sessionVersionOf(user.id)).toBe(1);
      expect(await applySessionVersion({ ...token }, false)).toBeNull();
      expect(await applySessionVersion(copy, false)).toBeNull();

      // A new sign-in gets the new version and works.
      const fresh = await applySessionVersion({ sub: user.id, role, authTime: nowSec() }, true);
      expect(fresh?.sv).toBe(1);
      expect(await applySessionVersion({ ...fresh }, false)).not.toBeNull();
    }
  });

  it("signing out with an already stale token changes nothing (an old cookie cannot end a newer session)", async () => {
    const user = await createUser("ADMIN");
    const old = await applySessionVersion({ sub: user.id, authTime: nowSec() }, true);
    await revokeSessions(old);
    const fresh = await applySessionVersion({ sub: user.id, authTime: nowSec() }, true);

    expect(await revokeSessions(old)).toBe(false);
    expect(await sessionVersionOf(user.id)).toBe(1);
    expect(await applySessionVersion({ ...fresh }, false)).not.toBeNull();
    expect(await revokeSessions(null)).toBe(false);
    expect(await revokeSessions({ sub: user.id })).toBe(false);
  });
});

describe("R-118 R-104 R-123 Q-29 absolute session lifetime (no sliding expiry)", () => {
  const T0 = Date.UTC(2026, 10, 18, 9, 0, 0);
  const sec = (ms: number) => Math.floor(ms / 1000);

  it("lifetime per role: staff STAFF_SESSION_MAX_AGE_SEC, seekers and employers SESSION_MAX_AGE_SEC", () => {
    for (const role of ["ADMIN", "STAFF_PLACEMENT", "STAFF_VISA"]) {
      expect(sessionMaxAgeSecOf(role)).toBe(STAFF_SESSION_MAX_AGE_SEC);
    }
    for (const role of ["SEEKER", "EMPLOYER", "AGENCY", undefined, "ROOT"]) {
      expect(sessionMaxAgeSecOf(role)).toBe(SESSION_MAX_AGE_SEC);
    }
  });

  it("isSessionExpired: authTime + lifetime, boundary inclusive; missing or non-numeric authTime is expired", () => {
    const authTime = sec(T0);
    const staff = { role: "ADMIN", authTime };
    expect(isSessionExpired(staff, authTime + STAFF_SESSION_MAX_AGE_SEC)).toBe(false);
    expect(isSessionExpired(staff, authTime + STAFF_SESSION_MAX_AGE_SEC + 1)).toBe(true);
    for (const role of ["SEEKER", "EMPLOYER"]) {
      expect(isSessionExpired({ role, authTime }, authTime + STAFF_SESSION_MAX_AGE_SEC + 1)).toBe(
        false,
      );
      expect(isSessionExpired({ role, authTime }, authTime + SESSION_MAX_AGE_SEC)).toBe(false);
      expect(isSessionExpired({ role, authTime }, authTime + SESSION_MAX_AGE_SEC + 1)).toBe(true);
    }
    expect(isSessionExpired({ role: "SEEKER" }, authTime)).toBe(true);
    expect(isSessionExpired({ role: "SEEKER", authTime: String(authTime) }, authTime)).toBe(true);
    expect(isSessionExpired({ role: "SEEKER", authTime: Number.NaN }, authTime)).toBe(true);
  });

  it("the JWT callback step refuses every role after authTime + lifetime, however often the session was read", async () => {
    const cases = [
      ["ADMIN", STAFF_SESSION_MAX_AGE_SEC],
      ["EMPLOYER", SESSION_MAX_AGE_SEC],
      ["SEEKER", SESSION_MAX_AGE_SEC],
    ] as const;
    for (const [role, maxAge] of cases) {
      const user = await createUser(role);
      const signedIn = await applySessionVersion(
        { sub: user.id, role, authTime: sec(T0) },
        true,
        new Date(T0),
      );
      expect(signedIn).not.toBeNull();

      // Read the session (like GET /api/auth/session) every hour up to the last second: each
      // call passes the token back unchanged — authTime is never moved forward.
      let token = { ...signedIn! };
      for (let t = T0; t <= T0 + maxAge * 1000; t += 3600 * 1000) {
        const next = await applySessionVersion({ ...token }, false, new Date(t));
        expect(next, `${role} at +${(t - T0) / 1000}s`).not.toBeNull();
        expect(next!.authTime).toBe(sec(T0));
        token = { ...next! };
      }
      expect(
        await applySessionVersion({ ...token }, false, new Date(T0 + maxAge * 1000)),
      ).not.toBeNull();
      expect(
        await applySessionVersion({ ...token }, false, new Date(T0 + (maxAge + 1) * 1000)),
      ).toBeNull();
    }
  });

  it("a fresh sign-in starts a new lifetime; a token without authTime is refused", async () => {
    const user = await createUser("SEEKER");
    const late = T0 + (SESSION_MAX_AGE_SEC + 10) * 1000;
    const fresh = await applySessionVersion(
      { sub: user.id, role: "SEEKER" as const, authTime: sec(late) },
      true,
      new Date(late),
    );
    expect(await applySessionVersion({ ...fresh! }, false, new Date(late + 1000))).not.toBeNull();
    expect(
      await applySessionVersion({ sub: user.id, role: "SEEKER", sv: 0 }, false, new Date(late)),
    ).toBeNull();
  });
});

describe("R-118 I-1 middleware claims (read only)", () => {
  async function cookieFor(name: string, claims: Record<string, unknown>, secret = SECRET) {
    const value = await encode({ token: claims, secret, salt: name });
    return `${name}=${value}`;
  }

  it("decrypts the Auth.js session cookie (http and https names)", async () => {
    const claims = { sub: "u1", role: "ADMIN", twoFactorVerified: true, sv: 2 };
    for (const name of ["authjs.session-token", "__Secure-authjs.session-token"]) {
      const headers = new Headers({ cookie: `other=1; ${await cookieFor(name, claims)}` });
      expect(await readSessionClaims(headers)).toMatchObject(claims);
    }
  });

  it("no cookie, a foreign secret or only a bearer header → no claims", async () => {
    expect(await readSessionClaims(new Headers())).toBeNull();
    const foreign = await cookieFor(
      "authjs.session-token",
      { sub: "u1" },
      "another-secret-0123456789",
    );
    expect(await readSessionClaims(new Headers({ cookie: foreign }))).toBeNull();
    const value = await encode({
      token: { sub: "u1" },
      secret: SECRET,
      salt: "authjs.session-token",
    });
    expect(
      await readSessionClaims(new Headers({ authorization: `Bearer ${value}`, cookie: "x=1" })),
    ).toBeNull();
  });
});

describe("R-118 I-1 /admin/login sends only a live verified staff session to /admin", () => {
  const now = () => Math.floor(Date.now() / 1000);
  const sessionOf = (id: string, role: string, twoFactorVerified: boolean) => ({
    user: { id, role, twoFactorVerified, totpEnrolled: true, authTime: now() },
  });

  it("no session (also: a signed-out token, which auth() turns into null) → stay on the login page", async () => {
    current.session = null;
    expect(await hasVerifiedStaffSession()).toBe(false);
  });

  it("verified staff with TOTP enrolled → true; password-only, non-staff or not enrolled → false", async () => {
    const admin = await db.user.create({
      data: { role: "ADMIN", email: randomEmail("sv-login"), totpEnabledAt: new Date() },
    });
    current.session = sessionOf(admin.id, "ADMIN", true);
    expect(await hasVerifiedStaffSession()).toBe(true);
    current.session = sessionOf(admin.id, "ADMIN", false);
    expect(await hasVerifiedStaffSession()).toBe(false);

    const notEnrolled = await createUser("ADMIN");
    current.session = sessionOf(notEnrolled.id, "ADMIN", true);
    expect(await hasVerifiedStaffSession()).toBe(false);

    const employer = await createUser("EMPLOYER");
    current.session = sessionOf(employer.id, "ADMIN", true);
    expect(await hasVerifiedStaffSession()).toBe(false);
  });
});
