"use server";

import { revalidatePath } from "next/cache";

import { adminAction } from "@/lib/admin/actionGuard";
import { requireStaff } from "@/lib/admin/session";
import { createVisaCase, updateVisaCase } from "@/lib/admin/visaCases";
import { assertCan } from "@/lib/rbac";
import { visaCaseCreateSchema, visaCaseUpdateSchema } from "@/schemas/admin/visaCases";

/**
 * 체류 사건(VisaCase) 서버 액션 (R-216, WO §11). First statement `requireStaff()`, next
 * `assertCan(actor, "visaCase:manage")` (STAFF_VISA·ADMIN — STAFF_PLACEMENT gets FORBIDDEN).
 * BR-13: the form has no 고유식별정보 field.
 */
function fields(fd: FormData) {
  return {
    caseType: fd.get("caseType"),
    targetVisa: fd.get("targetVisa") ?? "",
    status: fd.get("status"),
    companyId: fd.get("companyId") ?? "",
    mandateSignedAt: fd.get("mandateSignedAt") ?? "",
    fee: fd.get("fee") ?? "",
  };
}

export type VisaCaseActionState =
  { ok: true; at: number; id: string } | { ok: false; code: string } | null;

export const createVisaCaseAction = adminAction(async function createVisaCaseAction(
  _prev: VisaCaseActionState,
  fd: FormData,
): Promise<VisaCaseActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "visaCase:manage");
  const parsed = visaCaseCreateSchema.safeParse({ seekerId: fd.get("seekerId"), ...fields(fd) });
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const r = await createVisaCase(actor, parsed.data);
  if (!r.ok) return { ok: false, code: r.code };
  revalidatePath("/admin/visa-cases");
  return { ok: true, at: Date.now(), id: r.id };
});

export const updateVisaCaseAction = adminAction(async function updateVisaCaseAction(
  _prev: VisaCaseActionState,
  fd: FormData,
): Promise<VisaCaseActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "visaCase:manage");
  const parsed = visaCaseUpdateSchema.safeParse({
    visaCaseId: fd.get("visaCaseId"),
    ...fields(fd),
  });
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const r = await updateVisaCase(actor, parsed.data);
  if (!r.ok) return { ok: false, code: r.code };
  revalidatePath("/admin/visa-cases");
  revalidatePath(`/admin/visa-cases/${r.id}`);
  return { ok: true, at: Date.now(), id: r.id };
});
