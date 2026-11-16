"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/admin/session";
import {
  type GradeRequirement,
  type SeekerPiiValues,
  changeSeekerGrade,
  changeSeekerTrack,
  revealSeekerPii,
  setConvertibility,
  updateReviewFlags,
} from "@/lib/admin/seekerReview";
import { assertCan } from "@/lib/rbac";
import {
  seekerConvertibilitySchema,
  seekerGradeChangeSchema,
  seekerPiiRevealSchema,
  seekerReviewFlagsSchema,
  seekerTrackChangeSchema,
} from "@/schemas/admin/review";

/**
 * 구직자 검토 서버 액션 (R-120, R-122). First statement `requireStaff()` (staff + 2FA, STANDARD 4.5),
 * next statement the action's own permission:
 * - 등급·트랙·확인 항목·전환 가능성: `seeker:review` (STAFF_VISA·ADMIN, DECISIONS Q-08)
 * - 이름·학교·이전 직장명 열람: `seeker:view` (모든 직원)
 * - 전화·메신저·이메일 열람: `contact:view` (STAFF_PLACEMENT·ADMIN, WO §11)
 */
export type AdminActionState =
  { ok: true; at: number } | { ok: false; code: string; missing?: GradeRequirement[] } | null;

function form(fd: FormData, keys: string[]): Record<string, FormDataEntryValue | null> {
  return Object.fromEntries(keys.map((k) => [k, fd.get(k)]));
}

function done(seekerId: string): AdminActionState {
  revalidatePath(`/admin/seekers/${seekerId}`);
  revalidatePath("/admin/seekers");
  revalidatePath("/admin");
  return { ok: true, at: Date.now() };
}

export async function changeGradeAction(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "seeker:review");
  const parsed = seekerGradeChangeSchema.safeParse(form(fd, ["seekerId", "to"]));
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const r = await changeSeekerGrade({ actorId: actor.id, ...parsed.data });
  return r.ok ? done(parsed.data.seekerId) : { ok: false, code: r.code, missing: r.missing };
}

export async function changeTrackAction(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "seeker:review");
  const parsed = seekerTrackChangeSchema.safeParse(form(fd, ["seekerId", "to"]));
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const r = await changeSeekerTrack({ actorId: actor.id, ...parsed.data });
  return r.ok ? done(parsed.data.seekerId) : { ok: false, code: r.code };
}

export async function updateReviewFlagsAction(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "seeker:review");
  const parsed = seekerReviewFlagsSchema.safeParse(
    form(fd, ["seekerId", "consulted", "verifiedVisa", "verifiedKorean"]),
  );
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const { seekerId, ...patch } = parsed.data;
  const r = await updateReviewFlags({ actorId: actor.id, seekerId, patch });
  return r.ok ? done(seekerId) : { ok: false, code: r.code };
}

export async function setConvertibilityAction(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "seeker:review");
  const parsed = seekerConvertibilitySchema.safeParse(
    form(fd, ["seekerId", "convertibleVisa", "convertibleAt"]),
  );
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const r = await setConvertibility({ actorId: actor.id, ...parsed.data });
  return r.ok ? done(parsed.data.seekerId) : { ok: false, code: r.code };
}

export type RevealState =
  { ok: true; values: SeekerPiiValues } | { ok: false; code: string } | null;

async function reveal(
  actorId: string,
  fd: FormData,
  group: "basic" | "contact",
): Promise<RevealState> {
  const parsed = seekerPiiRevealSchema.safeParse({ seekerId: fd.get("seekerId"), group });
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const values = await revealSeekerPii({ actorId, ...parsed.data });
  return values ? { ok: true, values } : { ok: false, code: "NOT_FOUND" };
}

/** R-122: 이름·학교·이전 직장명. Each call writes PII_VIEW before the values are returned. */
export async function revealSeekerBasicAction(
  _prev: RevealState,
  fd: FormData,
): Promise<RevealState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "seeker:view");
  return reveal(actor.id, fd, "basic");
}

/** R-122: 전화·메신저·이메일 (WO §11). Each call writes PII_VIEW before the values are returned. */
export async function revealSeekerContactAction(
  _prev: RevealState,
  fd: FormData,
): Promise<RevealState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "contact:view");
  return reveal(actor.id, fd, "contact");
}
