/**
 * Server-side staff checks for `/admin/**` pages and admin server actions (R-118, STANDARD 4.5,
 * S-41). The middleware already redirected on the JWT claims; this repeats the decision against
 * the database (account still exists, still staff, TOTP really enrolled) and returns the actor.
 */
import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  ADMIN_2FA_SETUP_PATH,
  ADMIN_2FA_VERIFY_PATH,
  ADMIN_LOGIN_PATH,
  staffState,
} from "@/lib/authGuard";
import { db } from "@/lib/db";
import { AuthzError, type Permission, assertCan, isStaff } from "@/lib/rbac";

export type StaffActor = {
  id: string;
  role: Role;
  displayName: string | null;
  totpEnrolled: boolean;
};

type Stage = "verified" | "pending2fa";

/**
 * `verified` (default): full admin access — staff role + 2FA done, else redirect.
 * `pending2fa`: the 2FA screens — a staff password session that has not finished TOTP yet.
 */
export async function requireStaff(stage: Stage = "verified"): Promise<StaffActor> {
  const session = await auth();
  const state = staffState(session?.user ?? null, Math.floor(Date.now() / 1000));
  if (!session?.user || state === "NONE") redirect(ADMIN_LOGIN_PATH);

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, displayName: true, totpEnabledAt: true },
  });
  if (!user || !isStaff(user.role)) redirect(ADMIN_LOGIN_PATH);
  assertCan(user.role, "admin:access");

  const actor: StaffActor = {
    id: user.id,
    role: user.role,
    displayName: user.displayName,
    totpEnrolled: user.totpEnabledAt != null,
  };
  if (stage === "verified") {
    if (state !== "VERIFIED" || !actor.totpEnrolled) {
      redirect(actor.totpEnrolled ? ADMIN_2FA_VERIFY_PATH : ADMIN_2FA_SETUP_PATH);
    }
  } else if (state === "VERIFIED" && actor.totpEnrolled) {
    redirect("/admin");
  }
  return actor;
}

/**
 * Route Handler variant of `requireStaff` (R-210 `/api/files/[token]`): the same database check
 * (staff role, TOTP enrolled, 2FA done in this session) plus `assertCan(role, permission)`, but it
 * throws AuthzError (401 / 403) instead of redirecting, so an API answers with a status code.
 */
export async function requireStaffApi(permission: Permission): Promise<StaffActor> {
  const session = await auth();
  const state = staffState(session?.user ?? null, Math.floor(Date.now() / 1000));
  if (!session?.user || state !== "VERIFIED") {
    throw new AuthzError("UNAUTHENTICATED", 401, "staff sign-in with 2FA required");
  }
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, displayName: true, totpEnabledAt: true },
  });
  if (!user || !isStaff(user.role) || user.totpEnabledAt == null) {
    throw new AuthzError("UNAUTHENTICATED", 401, "staff sign-in with 2FA required");
  }
  assertCan(user.role, "admin:access");
  assertCan(user.role, permission);
  return { id: user.id, role: user.role, displayName: user.displayName, totpEnrolled: true };
}

/**
 * /admin/login (integration QA I-1): true when the request carries a live staff session that
 * `requireStaff()` would let into /admin — session version current (checked in `auth()`), staff
 * role, TOTP enrolled, 2FA done. The login page then sends the user to /admin; the middleware no
 * longer does, because from the claims alone it cannot tell a signed-out token from a live one.
 */
export async function hasVerifiedStaffSession(): Promise<boolean> {
  const session = await auth();
  if (staffState(session?.user ?? null, Math.floor(Date.now() / 1000)) !== "VERIFIED") return false;
  const user = await db.user.findUnique({
    where: { id: session?.user.id ?? "" },
    select: { role: true, totpEnabledAt: true },
  });
  return user != null && isStaff(user.role) && user.totpEnabledAt != null;
}
