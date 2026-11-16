"use server";

import { revalidatePath } from "next/cache";

import {
  type LeadContact,
  recordLeadCall,
  revealLeadContact,
  verifyLead,
} from "@/lib/admin/leadDesk";
import { adminAction } from "@/lib/admin/actionGuard";
import { requireStaff } from "@/lib/admin/session";
import { assertCan } from "@/lib/rbac";
import { isFinalCallOutcome, leadCallSchema, leadIdSchema } from "@/schemas/admin/leads";

import type { AdminActionState } from "./seekers";

/**
 * 리드 서버 액션 (R-121, R-122). First statement `requireStaff()` (staff + 2FA, STANDARD 4.5), next
 * statement the permission: 통화 기록·검증 `lead:manage`, 연락처 열람 `contact:view`
 * (both STAFF_PLACEMENT·ADMIN; STAFF_VISA has neither — WO §11).
 * Each action is wrapped in `adminAction` so a refused permission returns `{ ok: false, code:
 * "FORBIDDEN" }` instead of an unhandled error (QA O-3).
 */
function done(leadId: string): AdminActionState {
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
  return { ok: true, at: Date.now() };
}

export const recordCallAction = adminAction(async function recordCallAction(
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
    confirmFinal: fd.get("confirmFinal") ?? "",
  });
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const { confirmFinal, ...call } = parsed.data;
  // Q-14: 재접촉금지로 가는 결과(NO_INTENT·DNC)는 되돌릴 수 없어 화면의 확인을 거친 요청만 받는다.
  if (isFinalCallOutcome(call.outcome) && confirmFinal !== "yes") {
    return { ok: false, code: "CONFIRM_REQUIRED" };
  }
  const r = await recordLeadCall({ actorId: actor.id, ...call });
  return r.ok ? done(parsed.data.leadId) : { ok: false, code: r.code };
});

export const verifyLeadAction = adminAction(async function verifyLeadAction(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "lead:manage");
  const parsed = leadIdSchema.safeParse({ leadId: fd.get("leadId") });
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const r = await verifyLead({ actorId: actor.id, leadId: parsed.data.leadId });
  return r.ok ? done(parsed.data.leadId) : { ok: false, code: r.code };
});

export type LeadContactState =
  { ok: true; values: LeadContact } | { ok: false; code: string } | null;

/** R-122: each call writes PII_VIEW before the values are returned. */
export const revealLeadContactAction = adminAction(async function revealLeadContactAction(
  _prev: LeadContactState,
  fd: FormData,
): Promise<LeadContactState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "contact:view");
  const parsed = leadIdSchema.safeParse({ leadId: fd.get("leadId") });
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const values = await revealLeadContact({ actorId: actor.id, leadId: parsed.data.leadId });
  return values ? { ok: true, values } : { ok: false, code: "NOT_FOUND" };
});
