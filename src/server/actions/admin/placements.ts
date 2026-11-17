"use server";

import { revalidatePath } from "next/cache";

import { adminAction } from "@/lib/admin/actionGuard";
import { createPlacement, updatePlacement } from "@/lib/admin/placements";
import { requireStaff } from "@/lib/admin/session";
import { assertCan } from "@/lib/rbac";
import { placementCreateSchema, placementUpdateSchema } from "@/schemas/admin/placements";

import type { AdminActionState } from "./seekers";

/**
 * 계약(Placement) 서버 액션 (R-216). First statement `requireStaff()`, next
 * `assertCan(actor, "placement:manage")` (STAFF_PLACEMENT·ADMIN). No delete action (소개 기록 보존).
 */
function fields(fd: FormData) {
  return {
    contractDate: fd.get("contractDate"),
    monthlyWage: fd.get("monthlyWage"),
    feeAmount: fd.get("feeAmount"),
    feeStatus: fd.get("feeStatus"),
  };
}

function done(): AdminActionState {
  revalidatePath("/admin/placements");
  return { ok: true, at: Date.now() };
}

export const createPlacementAction = adminAction(async function createPlacementAction(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "placement:manage");
  const parsed = placementCreateSchema.safeParse({
    recommendationId: fd.get("recommendationId"),
    ...fields(fd),
  });
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const r = await createPlacement(parsed.data);
  return r.ok ? done() : { ok: false, code: r.code };
});

export const updatePlacementAction = adminAction(async function updatePlacementAction(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "placement:manage");
  const parsed = placementUpdateSchema.safeParse({
    placementId: fd.get("placementId"),
    ...fields(fd),
  });
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const r = await updatePlacement(parsed.data);
  return r.ok ? done() : { ok: false, code: r.code };
});
