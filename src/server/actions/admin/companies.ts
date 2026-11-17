"use server";

import { revalidatePath } from "next/cache";

import { adminAction } from "@/lib/admin/actionGuard";
import { setCompanyContract, setCompanyVerified } from "@/lib/admin/companies";
import { requireStaff } from "@/lib/admin/session";
import { assertCan } from "@/lib/rbac";
import { companyContractSchema, companyVerifySchema } from "@/schemas/admin/companies";

import type { AdminActionState } from "./seekers";

/**
 * 기업 검증·계약 등록 서버 액션 (R-218). First statement `requireStaff()` (staff + 2FA, STANDARD 4.5),
 * next statement `assertCan(actor, "company:verify")` (STAFF_PLACEMENT·ADMIN — DECISIONS Q-08).
 * Wrapped in `adminAction` so a refused permission returns `{ ok: false, code: "FORBIDDEN" }`.
 * Each change writes AuditLog COMPANY_VERIFY (src/lib/admin/companies.ts).
 */
function done(): AdminActionState {
  revalidatePath("/admin/companies");
  return { ok: true, at: Date.now() };
}

export const setCompanyVerifiedAction = adminAction(async function setCompanyVerifiedAction(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "company:verify");
  const parsed = companyVerifySchema.safeParse({
    companyId: fd.get("companyId"),
    verified: fd.get("verified"),
  });
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const r = await setCompanyVerified({ actorId: actor.id, ...parsed.data });
  return r.ok ? done() : { ok: false, code: r.code };
});

export const setCompanyContractAction = adminAction(async function setCompanyContractAction(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "company:verify");
  const parsed = companyContractSchema.safeParse({
    companyId: fd.get("companyId"),
    signedOn: fd.get("signedOn") ?? "",
  });
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const r = await setCompanyContract({
    actorId: actor.id,
    companyId: parsed.data.companyId,
    signedOn: parsed.data.signedOn,
  });
  return r.ok ? done() : { ok: false, code: r.code };
});
