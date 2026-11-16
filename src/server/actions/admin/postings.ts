"use server";

import { revalidatePath } from "next/cache";

import { adminAction } from "@/lib/admin/actionGuard";
import { requireStaff } from "@/lib/admin/session";
import {
  closePosting,
  createPostingFromLead,
  publishPosting,
  verifyPosting,
} from "@/lib/postings/manage";
import { assertCan } from "@/lib/rbac";
import { postingCreateSchema, postingIdSchema } from "@/schemas/admin/postings";

import type { AdminActionState } from "./seekers";

/**
 * 블라인드 공고 서버 액션 (R-201). First statement `requireStaff()` (staff + 2FA, STANDARD 4.5), next
 * statement `assertCan(actor, "posting:manage")` (STAFF_PLACEMENT·ADMIN — rbac.ts). Wrapped in
 * `adminAction` so a refused permission returns `{ ok: false, code: "FORBIDDEN" }` (STANDARD 4.5 H-1).
 * Business refusals (C·B lead, unverified publish …) come back as `{ ok: false, code }` from
 * src/lib/postings/manage.ts.
 */
export type CreatePostingState =
  { ok: true; postingId: string } | { ok: false; code: string; field?: string } | null;

function done(postingId?: string) {
  revalidatePath("/admin/postings");
  if (postingId) revalidatePath(`/admin/postings/${postingId}`);
}

export const createPostingAction = adminAction(async function createPostingAction(
  _prev: CreatePostingState,
  fd: FormData,
): Promise<CreatePostingState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "posting:manage");
  const parsed = postingCreateSchema.safeParse({
    leadId: fd.get("leadId"),
    blindTitle: fd.get("blindTitle"),
    role: fd.get("role"),
    industryCode: fd.get("industryCode"),
    sido: fd.get("sido"),
    sigungu: fd.get("sigungu"),
    payMin: fd.get("payMin"),
    payMax: fd.get("payMax"),
    overtimeNote: fd.get("overtimeNote"),
    dormitory: fd.get("dormitory"),
    meals: fd.get("meals"),
    shift: fd.get("shift"),
    headcount: fd.get("headcount"),
    eligibleVisas: fd.getAll("eligibleVisas"),
  });
  if (!parsed.success) {
    return { ok: false, code: "INVALID_INPUT", field: String(parsed.error.issues[0]?.path[0]) };
  }
  const r = await createPostingFromLead({ actorId: actor.id, input: parsed.data });
  if (!r.ok) return { ok: false, code: r.code };
  done(r.postingId);
  return { ok: true, postingId: r.postingId };
});

function postingId(fd: FormData): string | null {
  const parsed = postingIdSchema.safeParse({ postingId: fd.get("postingId") });
  return parsed.success ? parsed.data.postingId : null;
}

function stepResult(id: string, r: { ok: true } | { ok: false; code: string }): AdminActionState {
  if (!r.ok) return { ok: false, code: r.code };
  done(id);
  return { ok: true, at: Date.now() };
}

/** BR-05: records verifiedBy / verifiedAt on a DRAFT posting. */
export const verifyPostingAction = adminAction(async function verifyPostingAction(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "posting:manage");
  const id = postingId(fd);
  if (!id) return { ok: false, code: "INVALID_INPUT" };
  return stepResult(id, await verifyPosting({ actorId: actor.id, postingId: id }));
});

/** WO §15-4: refused without verifiedBy / verifiedAt; writes POSTING_PUBLISH (BR-15). */
export const publishPostingAction = adminAction(async function publishPostingAction(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "posting:manage");
  const id = postingId(fd);
  if (!id) return { ok: false, code: "INVALID_INPUT" };
  return stepResult(id, await publishPosting({ actorId: actor.id, postingId: id }));
});

/** DRAFT / PUBLISHED → CLOSED. */
export const closePostingAction = adminAction(async function closePostingAction(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "posting:manage");
  const id = postingId(fd);
  if (!id) return { ok: false, code: "INVALID_INPUT" };
  return stepResult(id, await closePosting({ actorId: actor.id, postingId: id }));
});
