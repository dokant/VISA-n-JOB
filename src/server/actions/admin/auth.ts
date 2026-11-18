"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn, signOut, unstable_update } from "@/auth";
import { requireStaff } from "@/lib/admin/session";
import { createTotpProof, verifyStaffTotp } from "@/lib/authCredentials";
import { ADMIN_HOME_PATH, ADMIN_LOGIN_PATH } from "@/lib/authGuard";
import { staffLoginSchema, totpCodeSchema } from "@/schemas/auth/auth";

/** Korean-only admin screens map these codes to text (src/app/admin/_components/messages.ts). */
export type AdminAuthState = { ok: false; code: string } | { ok: true; redirectTo: string } | null;

/** /admin/login — e-mail + password (R-118). Then the middleware sends the user to 2FA. */
export async function signInStaff(
  _prev: AdminAuthState,
  formData: FormData,
): Promise<AdminAuthState> {
  // rbac: public — 직원 로그인 (비로그인 상태에서 호출, 검증·속도 제한은 authorize 안에서)
  const parsed = staffLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, code: "INVALID_CREDENTIALS" };
  try {
    await signIn("staff-password", { ...parsed.data, redirect: false });
  } catch (e) {
    if (e instanceof AuthError) {
      return {
        ok: false,
        code: (e as AuthError & { code?: string }).code ?? "INVALID_CREDENTIALS",
      };
    }
    throw e;
  }
  // The browser navigates itself (full request with the new session cookie); a server-side
  // redirect here would be resolved before the cookie reaches the middleware.
  return { ok: true, redirectTo: ADMIN_HOME_PATH };
}

/** /admin/2fa/setup and /admin/2fa/verify — TOTP code (R-118). Upgrades the session on success. */
export async function verifyStaffTotpCode(
  _prev: AdminAuthState,
  formData: FormData,
): Promise<AdminAuthState> {
  const actor = await requireStaff("pending2fa"); // rbac: 직원 역할(admin:access) + 비밀번호 단계 완료
  const parsed = totpCodeSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { ok: false, code: "INVALID_CODE" };
  const result = await verifyStaffTotp({ userId: actor.id, code: parsed.data.code });
  if (!result.ok) return { ok: false, code: result.code };
  await unstable_update({ totpProof: createTotpProof(actor.id) } as never);
  return { ok: true, redirectTo: ADMIN_HOME_PATH };
}

/**
 * Admin sign-out. Auth.js `events.signOut` (src/auth.ts) raises the account's session version
 * first (integration QA I-1), so this token and every copy of it are refused from now on; then the
 * cookie is cleared.
 */
export async function signOutStaff(): Promise<void> {
  // rbac: public — 자기 세션만 끝낸다 (세션이 없거나 이미 끝난 토큰이면 무해)
  await signOut({ redirect: false });
  redirect(ADMIN_LOGIN_PATH);
}
