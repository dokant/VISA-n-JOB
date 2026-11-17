"use server";

import { revalidatePath } from "next/cache";

import { adminAction } from "@/lib/admin/actionGuard";
import { requireStaff } from "@/lib/admin/session";
import { assertCan } from "@/lib/rbac";
import {
  attachIntroConfirm,
  cancelInterview,
  confirmInterview,
  createInterview,
  introConfirmUrl,
  recordInterviewResult,
  rescheduleInterview,
} from "@/lib/recommendations/interviews";
import { recommendForInterest, recommendForPosting } from "@/lib/recommendations/matching";
import {
  interviewCreateSchema,
  interviewIdSchema,
  interviewRescheduleSchema,
  interviewResultSchema,
  recommendForInterestSchema,
  recommendForPostingSchema,
} from "@/schemas/admin/matching";

import type { AdminActionState } from "./seekers";

/**
 * 매칭·추천·면접 서버 액션 (R-209, R-210, R-211). First statement `requireStaff()` (staff + 2FA,
 * STANDARD 4.5), next `assertCan(actor, …)`: 추천 실행 `recommendation:create`, 면접 `interview:manage`
 * (both STAFF_PLACEMENT·ADMIN). Wrapped in `adminAction` (AuthzError → `{ ok: false, code }`).
 * The ledger write and its RECOMMENDATION_CREATE audit row happen in src/lib/recommendations/ledger.ts.
 */
function done(...paths: string[]): AdminActionState {
  for (const p of ["/admin/matching", "/admin", ...paths]) revalidatePath(p);
  return { ok: true, at: Date.now() };
}

export type RecommendActionState =
  | { ok: true; at: number; already: boolean; recommendationId: string }
  | { ok: false; code: string }
  | null;

export const recommendForPostingAction = adminAction(async function recommendForPostingAction(
  _prev: RecommendActionState,
  fd: FormData,
): Promise<RecommendActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "recommendation:create");
  const parsed = recommendForPostingSchema.safeParse({
    postingId: fd.get("postingId"),
    seekerId: fd.get("seekerId"),
    note: fd.get("note") ?? "",
  });
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const r = await recommendForPosting({ staffId: actor.id, ...parsed.data });
  if (!r.ok) return { ok: false, code: r.code };
  done(`/admin/matching/${parsed.data.postingId}`);
  return {
    ok: true,
    at: Date.now(),
    already: r.already,
    recommendationId: r.recommendation.id,
  };
});

export const recommendForInterestAction = adminAction(async function recommendForInterestAction(
  _prev: RecommendActionState,
  fd: FormData,
): Promise<RecommendActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "recommendation:create");
  const parsed = recommendForInterestSchema.safeParse({
    interestRequestId: fd.get("interestRequestId"),
    note: fd.get("note") ?? "",
  });
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const r = await recommendForInterest({ staffId: actor.id, ...parsed.data });
  if (!r.ok) return { ok: false, code: r.code };
  done();
  return {
    ok: true,
    at: Date.now(),
    already: r.already,
    recommendationId: r.recommendation.id,
  };
});

function recPath(fd: FormData): string {
  const id = fd.get("recommendationId");
  return typeof id === "string" && id ? `/admin/matching/recommendations/${id}` : "/admin/matching";
}

export const createInterviewAction = adminAction(async function createInterviewAction(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "interview:manage");
  const parsed = interviewCreateSchema.safeParse({
    recommendationId: fd.get("recommendationId"),
    scheduledAt: fd.get("scheduledAt"),
    place: fd.get("place"),
    interpreter: fd.get("interpreter") ?? "",
  });
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const r = await createInterview(parsed.data);
  return r.ok ? done(recPath(fd)) : { ok: false, code: r.code };
});

export const rescheduleInterviewAction = adminAction(async function rescheduleInterviewAction(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "interview:manage");
  const parsed = interviewRescheduleSchema.safeParse({
    interviewId: fd.get("interviewId"),
    scheduledAt: fd.get("scheduledAt"),
    place: fd.get("place"),
    interpreter: fd.get("interpreter") ?? "",
  });
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const r = await rescheduleInterview(parsed.data);
  return r.ok ? done(recPath(fd)) : { ok: false, code: r.code };
});

/** 면접 확정 (R-211): the seeker is asked for the per-interview consent from now on. */
export const confirmInterviewAction = adminAction(async function confirmInterviewAction(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "interview:manage");
  const parsed = interviewIdSchema.safeParse({ interviewId: fd.get("interviewId") });
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const r = await confirmInterview(parsed.data);
  return r.ok ? done(recPath(fd)) : { ok: false, code: r.code };
});

export const cancelInterviewAction = adminAction(async function cancelInterviewAction(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "interview:manage");
  const parsed = interviewIdSchema.safeParse({ interviewId: fd.get("interviewId") });
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const r = await cancelInterview(parsed.data);
  return r.ok ? done(recPath(fd)) : { ok: false, code: r.code };
});

export const recordInterviewResultAction = adminAction(async function recordInterviewResultAction(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "interview:manage");
  const parsed = interviewResultSchema.safeParse({
    interviewId: fd.get("interviewId"),
    attended: fd.get("attended") ?? "",
    result: fd.get("result") ?? "",
  });
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const r = await recordInterviewResult(parsed.data);
  return r.ok ? done(recPath(fd)) : { ok: false, code: r.code };
});

/** 소개 확인서 업로드 (R-210): PDF / JPEG / PNG within INTRO_CONFIRM_MAX_BYTES, private storage. */
export const uploadIntroConfirmAction = adminAction(async function uploadIntroConfirmAction(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "interview:manage");
  const parsed = interviewIdSchema.safeParse({ interviewId: fd.get("interviewId") });
  const file = fd.get("file");
  if (!parsed.success || !(file instanceof File)) return { ok: false, code: "INVALID_INPUT" };
  const r = await attachIntroConfirm({
    interviewId: parsed.data.interviewId,
    bytes: new Uint8Array(await file.arrayBuffer()),
  });
  return r.ok ? done(recPath(fd)) : { ok: false, code: r.code };
});

export type FileUrlState = { ok: true; url: string } | { ok: false; code: string };

/** A fresh 5-minute signed URL of the 소개 확인서, issued to this staff member (R-210). */
export const introConfirmUrlAction = adminAction(async function introConfirmUrlAction(
  interviewId: string,
): Promise<FileUrlState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "interview:manage");
  const parsed = interviewIdSchema.safeParse({ interviewId });
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const url = await introConfirmUrl({ interviewId: parsed.data.interviewId, staffId: actor.id });
  return url ? { ok: true, url } : { ok: false, code: "NOT_FOUND" };
});
