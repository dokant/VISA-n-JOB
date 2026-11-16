"use server";

import { revalidatePath } from "next/cache";

import {
  type LeadContact,
  recordLeadCall,
  revealLeadContact,
  verifyLead,
} from "@/lib/admin/leadDesk";
import { requireStaff } from "@/lib/admin/session";
import { assertCan } from "@/lib/rbac";
import { leadCallSchema, leadIdSchema } from "@/schemas/admin/leads";

import type { AdminActionState } from "./seekers";

/**
 * 리드 서버 액션 (R-121, R-122). First statement `requireStaff()` (staff + 2FA, STANDARD 4.5), next
 * statement the permission: 통화 기록·검증 `lead:manage`, 연락처 열람 `contact:view`
 * (both STAFF_PLACEMENT·ADMIN; STAFF_VISA has neither — WO §11).
 */
function done(leadId: string): AdminActionState {
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
  return { ok: true, at: Date.now() };
}

export async function recordCallAction(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "lead:manage");
  const parsed = leadCallSchema.safeParse({
    leadId: fd.get("leadId"),
    outcome: fd.get("outcome"),
    note: fd.get("note") ?? "",
    nextActionAt: fd.get("nextActionAt") ?? "",
  });
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const r = await recordLeadCall({ actorId: actor.id, ...parsed.data });
  return r.ok ? done(parsed.data.leadId) : { ok: false, code: r.code };
}

export async function verifyLeadAction(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "lead:manage");
  const parsed = leadIdSchema.safeParse({ leadId: fd.get("leadId") });
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const r = await verifyLead({ actorId: actor.id, leadId: parsed.data.leadId });
  return r.ok ? done(parsed.data.leadId) : { ok: false, code: r.code };
}

export type LeadContactState =
  { ok: true; values: LeadContact } | { ok: false; code: string } | null;

/** R-122: each call writes PII_VIEW before the values are returned. */
export async function revealLeadContactAction(
  _prev: LeadContactState,
  fd: FormData,
): Promise<LeadContactState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "contact:view");
  const parsed = leadIdSchema.safeParse({ leadId: fd.get("leadId") });
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const values = await revealLeadContact({ actorId: actor.id, leadId: parsed.data.leadId });
  return values ? { ok: true, values } : { ok: false, code: "NOT_FOUND" };
}
