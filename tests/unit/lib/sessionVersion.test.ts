/**
 * Integration QA I-1: server-side sign-out for JWT sessions. A token carries the account's
 * `sessionVersion` (claim `sv`); sign-out raises it and every older token is refused. The
 * middleware only reads the claims (no refresh, no Set-Cookie).
 */
import { encode } from "next-auth/jwt";
import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  applySessionVersion,
  isSessionCurrent,
  revokeSessions,
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

async function createUser(role: "ADMIN" | "EMPLOYER" | "SEEKER") {
  return db.user.create({ data: { role, email: randomEmail(`sv-${role.toLowerCase()}`) } });
}

describe("I-1 session version", () => {
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
    const token = await applySessionVersion({ sub: user.id, role: "ADMIN" as const }, true);
    expect(token).toMatchObject({ sub: user.id, sv: 4 });
    expect(await applySessionVersion({ ...token }, false)).toMatchObject({ sv: 4 });
  });

  it("refuses a token whose version differs from the database (signed out), has none, or lost its account", async () => {
    const user = await createUser("EMPLOYER");
    expect(await applySessionVersion({ sub: user.id, sv: 1 }, false)).toBeNull();
    expect(await applySessionVersion({ sub: user.id }, false)).toBeNull();
    expect(await applySessionVersion({ sub: "no-such-user", sv: 0 }, false)).toBeNull();
    expect(await applySessionVersion({ sub: "no-such-user" }, true)).toBeNull();
    expect(await applySessionVersion({ sv: 0 }, false)).toBeNull();
  });

  it("sign-out raises the version once, so the signed-out token (and every copy) is refused", async () => {
    for (const role of ["ADMIN", "EMPLOYER", "SEEKER"] as const) {
      const user = await createUser(role);
      const token = await applySessionVersion({ sub: user.id }, true);
      expect(token?.sv).toBe(0);
      const copy = { ...token };

      expect(await revokeSessions(token)).toBe(true);
      expect(await sessionVersionOf(user.id)).toBe(1);
      expect(await applySessionVersion({ ...token }, false)).toBeNull();
      expect(await applySessionVersion(copy, false)).toBeNull();

      // A new sign-in gets the new version and works.
      const fresh = await applySessionVersion({ sub: user.id }, true);
      expect(fresh?.sv).toBe(1);
      expect(await applySessionVersion({ ...fresh }, false)).not.toBeNull();
    }
  });

  it("signing out with an already stale token changes nothing (an old cookie cannot end a newer session)", async () => {
    const user = await createUser("ADMIN");
    const old = await applySessionVersion({ sub: user.id }, true);
    await revokeSessions(old);
    const fresh = await applySessionVersion({ sub: user.id }, true);

    expect(await revokeSessions(old)).toBe(false);
    expect(await sessionVersionOf(user.id)).toBe(1);
    expect(await applySessionVersion({ ...fresh }, false)).not.toBeNull();
    expect(await revokeSessions(null)).toBe(false);
    expect(await revokeSessions({ sub: user.id })).toBe(false);
  });
});

describe("I-1 middleware claims (read only)", () => {
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

describe("I-1 /admin/login sends only a live verified staff session to /admin", () => {
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
