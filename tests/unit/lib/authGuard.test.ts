/**
 * R-118: `/admin/*` is refused until a staff member has finished TOTP 2FA (middleware decision).
 */
import { describe, expect, it } from "vitest";

import { STAFF_SESSION_MAX_AGE_SEC } from "@/config/limits";
import { decideAdminAccess, isAdminPath, safeNextPath, staffState } from "@/lib/authGuard";

const NOW = 1_800_000_000;
const staff = (over: Record<string, unknown> = {}) => ({
  role: "STAFF_PLACEMENT",
  twoFactorVerified: false,
  totpEnrolled: true,
  authTime: NOW - 60,
  ...over,
});

describe("R-118 admin access", () => {
  it("R-118: no session → every admin page redirects to /admin/login", () => {
    for (const path of ["/admin", "/admin/seekers", "/admin/2fa/verify", "/admin/2fa/setup"]) {
      expect(decideAdminAccess(path, null, NOW)).toEqual({
        action: "redirect",
        to: "/admin/login",
      });
    }
    expect(decideAdminAccess("/admin/login", null, NOW)).toEqual({ action: "allow" });
  });

  it("R-118: password only (2FA not done) → /admin/* refused, sent to the 2FA screen", () => {
    const enrolled = staff();
    for (const path of ["/admin", "/admin/", "/admin/leads", "/admin/audit"]) {
      expect(decideAdminAccess(path, enrolled, NOW)).toEqual({
        action: "redirect",
        to: "/admin/2fa/verify",
      });
    }
    expect(decideAdminAccess("/admin/2fa/verify", enrolled, NOW)).toEqual({ action: "allow" });
    expect(decideAdminAccess("/admin/2fa/setup", enrolled, NOW)).toEqual({
      action: "redirect",
      to: "/admin/2fa/verify",
    });

    const notEnrolled = staff({ totpEnrolled: false });
    expect(decideAdminAccess("/admin", notEnrolled, NOW)).toEqual({
      action: "redirect",
      to: "/admin/2fa/setup",
    });
    expect(decideAdminAccess("/admin/2fa/setup", notEnrolled, NOW)).toEqual({ action: "allow" });
    expect(decideAdminAccess("/admin/2fa/verify", notEnrolled, NOW)).toEqual({
      action: "redirect",
      to: "/admin/2fa/setup",
    });
  });

  it("R-118: staff + 2FA verified → admin pages allowed, 2FA pages bounce to /admin", () => {
    const verified = staff({ twoFactorVerified: true });
    expect(decideAdminAccess("/admin", verified, NOW)).toEqual({ action: "allow" });
    expect(decideAdminAccess("/admin/leads", verified, NOW)).toEqual({ action: "allow" });
    for (const path of ["/admin/2fa/setup", "/admin/2fa/verify"]) {
      expect(decideAdminAccess(path, verified, NOW)).toEqual({ action: "redirect", to: "/admin" });
    }
  });

  it("I-1: the login page stays open for any claims (a signed-out token must not loop back to /admin)", () => {
    for (const claims of [null, staff(), staff({ twoFactorVerified: true })]) {
      expect(decideAdminAccess("/admin/login", claims, NOW)).toEqual({ action: "allow" });
      expect(decideAdminAccess("/admin/login/", claims, NOW)).toEqual({ action: "allow" });
    }
  });

  it("R-118: every staff role needs 2FA; portal roles never enter even with a 2FA claim", () => {
    for (const role of ["STAFF_PLACEMENT", "STAFF_VISA", "ADMIN"]) {
      expect(decideAdminAccess("/admin", staff({ role }), NOW).action).toBe("redirect");
      expect(decideAdminAccess("/admin", staff({ role, twoFactorVerified: true }), NOW)).toEqual({
        action: "allow",
      });
    }
    for (const role of ["SEEKER", "EMPLOYER", "AGENCY", "ROOT", undefined]) {
      expect(decideAdminAccess("/admin", staff({ role, twoFactorVerified: true }), NOW)).toEqual({
        action: "redirect",
        to: "/admin/login",
      });
    }
  });

  it("claims must be real booleans; staff sessions expire after STAFF_SESSION_MAX_AGE_SEC", () => {
    expect(staffState(staff({ twoFactorVerified: "true" }), NOW)).toBe("PASSWORD_ONLY_ENROLLED");
    const old = staff({ twoFactorVerified: true, authTime: NOW - STAFF_SESSION_MAX_AGE_SEC - 1 });
    expect(staffState(old, NOW)).toBe("NONE");
    expect(decideAdminAccess("/admin", old, NOW)).toEqual({
      action: "redirect",
      to: "/admin/login",
    });
    expect(staffState(staff({ authTime: undefined, twoFactorVerified: true }), NOW)).toBe("NONE");
  });

  it("isAdminPath does not match look-alike paths", () => {
    expect(isAdminPath("/admin")).toBe(true);
    expect(isAdminPath("/admin/x")).toBe(true);
    expect(isAdminPath("/administrator")).toBe(false);
    expect(isAdminPath("/ko/admin")).toBe(false);
  });

  it("safeNextPath rejects open redirects", () => {
    expect(safeNextPath("/employer/request", "/")).toBe("/employer/request");
    for (const bad of ["https://evil.test", "//evil.test", "/\\evil.test", "evil", 1, undefined]) {
      expect(safeNextPath(bad, "/")).toBe("/");
    }
  });
});
