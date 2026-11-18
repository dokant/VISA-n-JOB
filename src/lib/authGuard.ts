/**
 * Route access decisions from session claims (R-118, STANDARD 4.5 / S-41). Pure and Edge-safe:
 * the middleware calls it with the decoded JWT claims only — no Prisma, no Node APIs. The admin
 * pages and server actions repeat the check against the database (`src/lib/admin/session.ts`).
 *
 * `/admin/*` (except /admin/login) needs a staff role, an unexpired staff session and — except for
 * the two 2FA screens — `twoFactorVerified`. Staff who signed in with a password only are sent to
 * the 2FA screen (setup when not enrolled yet, verify otherwise).
 */
import type { Role } from "@prisma/client";

import { STAFF_SESSION_MAX_AGE_SEC } from "@/config/limits";

import { isRole, isStaff } from "./rbac";

export type SessionClaims = {
  role?: unknown;
  twoFactorVerified?: unknown;
  totpEnrolled?: unknown;
  /** seconds since epoch of the password sign-in */
  authTime?: unknown;
};

export const ADMIN_LOGIN_PATH = "/admin/login";
export const ADMIN_HOME_PATH = "/admin";
export const ADMIN_2FA_SETUP_PATH = "/admin/2fa/setup";
export const ADMIN_2FA_VERIFY_PATH = "/admin/2fa/verify";

export type AccessDecision = { action: "allow" } | { action: "redirect"; to: string };

const ALLOW: AccessDecision = { action: "allow" };
const redirect = (to: string): AccessDecision => ({ action: "redirect", to });

export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export type StaffState =
  "NONE" | "PASSWORD_ONLY_NOT_ENROLLED" | "PASSWORD_ONLY_ENROLLED" | "VERIFIED";

/** Where a session stands in the staff sign-in sequence. Expired staff sessions count as NONE. */
export function staffState(claims: SessionClaims | null | undefined, nowSec: number): StaffState {
  if (!claims) return "NONE";
  const role = claims.role;
  if (!isRole(role) || !isStaff(role as Role)) return "NONE";
  const authTime = typeof claims.authTime === "number" ? claims.authTime : 0;
  if (authTime + STAFF_SESSION_MAX_AGE_SEC < nowSec) return "NONE";
  if (claims.twoFactorVerified === true) return "VERIFIED";
  return claims.totpEnrolled === true ? "PASSWORD_ONLY_ENROLLED" : "PASSWORD_ONLY_NOT_ENROLLED";
}

/** Middleware decision for an `/admin` path. */
export function decideAdminAccess(
  pathname: string,
  claims: SessionClaims | null | undefined,
  nowSec: number = Math.floor(Date.now() / 1000),
): AccessDecision {
  const path = pathname.replace(/\/+$/, "") || "/";
  const state = staffState(claims, nowSec);

  // I-1: the login page is always open here. The claims cannot tell a signed-out (revoked) token
  // from a live one, so bouncing VERIFIED claims to /admin would loop with the page check
  // (/admin → requireStaff → /admin/login → /admin …). The login page itself sends a live, verified
  // staff session to /admin after the database check.
  if (path === ADMIN_LOGIN_PATH) return ALLOW;
  if (state === "NONE") return redirect(ADMIN_LOGIN_PATH);

  const pending2faPath =
    state === "PASSWORD_ONLY_NOT_ENROLLED" ? ADMIN_2FA_SETUP_PATH : ADMIN_2FA_VERIFY_PATH;

  if (path === ADMIN_2FA_SETUP_PATH || path === ADMIN_2FA_VERIFY_PATH) {
    if (state === "VERIFIED") return redirect(ADMIN_HOME_PATH);
    return path === pending2faPath ? ALLOW : redirect(pending2faPath);
  }
  return state === "VERIFIED" ? ALLOW : redirect(pending2faPath);
}

/**
 * Same-origin relative path for a post-login redirect, or the fallback. Rejects absolute URLs,
 * protocol-relative "//host" and backslash tricks (open redirect).
 */
export function safeNextPath(next: unknown, fallback: string): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) return fallback;
  if (next.includes("\\") || /[\u0000-\u001f]/.test(next)) return fallback;
  return next;
}
