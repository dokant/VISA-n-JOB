/**
 * 면접 일정 (PRD R-209, R-210, R-211; WO §6.5 매칭 "면접 일정"; BR-01, BR-03).
 *
 * An interview belongs to one recommendation (ledger row). Status: SCHEDULED → CONFIRMED (면접 확정)
 * → (CANCELLED). Result / attendance can be recorded at any time after scheduling.
 * - 면접 확정 starts the per-interview THIRD_PARTY_INTERVIEW consent request (PC-1, R-211): the seeker
 *   is told by SMS (template only, no company data) and answers on /seeker/me. Until the seeker
 *   agrees, the company sees the blind id only (src/lib/employer/interviews.ts).
 * - `place` is shown to the company of the interview, so contacts are refused (pii-guard, BR-01);
 *   the seeker never sees it (BR-03 상세 주소). `interpreter` is staff only.
 * - 소개 확인서 (R-210): stored in private storage (src/lib/files/storage.ts) and opened only through a
 *   5-minute signed URL issued to the staff member (src/lib/files/signedUrl.ts).
 */
import type { Locale } from "@/i18n/locales";
import { defaultLocale, locales } from "@/i18n/locales";
import { db } from "@/lib/db";
import { type FileUrlPurpose, signedFileUrl } from "@/lib/files/signedUrl";
import { storeIntroConfirm } from "@/lib/files/storage";
import { getNotificationProvider, type NotificationProvider } from "@/lib/notifications";
import { hasContacts } from "@/lib/pii-guard";

import { findRecommendation } from "./ledger";

type Client = typeof db;

export const INTERVIEW_STATUSES = ["SCHEDULED", "CONFIRMED", "CANCELLED"] as const;
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export const INTERVIEW_RESULTS = ["PENDING", "HIRED", "REJECTED", "NO_SHOW"] as const;
export type InterviewResult = (typeof INTERVIEW_RESULTS)[number];

/** SMS template of the consent request (messages `common.interviewConsent.sms`). */
export const INTERVIEW_CONSENT_TEMPLATE = "common.interviewConsent.sms";
export const INTRO_CONFIRM_PURPOSE: FileUrlPurpose = "INTRO_CONFIRM";

export type InterviewError =
  | "NOT_FOUND"
  | "PLACE_HAS_CONTACT"
  | "INTERVIEW_STATE"
  | "FILE_EMPTY"
  | "FILE_TOO_LARGE"
  | "FILE_TYPE";
export type InterviewResultOf<T = object> =
  ({ ok: true } & T) | { ok: false; code: InterviewError };

function hasContactText(...values: (string | null | undefined)[]): boolean {
  return values.some((v) => typeof v === "string" && hasContacts(v));
}

export async function createInterview(
  args: {
    recommendationId: string;
    scheduledAt: Date;
    place: string;
    interpreter: string | null;
  },
  client: Client = db,
): Promise<InterviewResultOf<{ id: string }>> {
  if (hasContactText(args.place, args.interpreter)) return { ok: false, code: "PLACE_HAS_CONTACT" };
  const rec = await findRecommendation(args.recommendationId, { id: true }, client);
  if (!rec) return { ok: false, code: "NOT_FOUND" };
  const row = await client.interview.create({
    data: {
      recommendationId: rec.id,
      scheduledAt: args.scheduledAt,
      place: args.place,
      interpreter: args.interpreter,
      status: "SCHEDULED",
    },
    select: { id: true },
  });
  return { ok: true, id: row.id };
}

/** Moves the date / place of an interview that is not cancelled. */
export async function rescheduleInterview(
  args: { interviewId: string; scheduledAt: Date; place: string; interpreter: string | null },
  client: Client = db,
): Promise<InterviewResultOf> {
  if (hasContactText(args.place, args.interpreter)) return { ok: false, code: "PLACE_HAS_CONTACT" };
  const r = await client.interview.updateMany({
    where: { id: args.interviewId, status: { not: "CANCELLED" } },
    data: { scheduledAt: args.scheduledAt, place: args.place, interpreter: args.interpreter },
  });
  return r.count === 1 ? { ok: true } : stateOrMissing(args.interviewId, client);
}

async function stateOrMissing(id: string, client: Client): Promise<InterviewResultOf> {
  const exists = await client.interview.count({ where: { id } });
  return { ok: false, code: exists ? "INTERVIEW_STATE" : "NOT_FOUND" };
}

function toLocale(value: string | null | undefined): Locale {
  return (locales as readonly string[]).includes(value ?? "") ? (value as Locale) : defaultLocale;
}

/**
 * 면접 확정 (R-211): SCHEDULED → CONFIRMED and the seeker is asked for consent. The SMS carries the
 * template and the /seeker/me path only. A failed send does not undo the confirmation (the request
 * is also shown on /seeker/me).
 */
export async function confirmInterview(
  args: { interviewId: string; now?: Date; provider?: NotificationProvider },
  client: Client = db,
): Promise<InterviewResultOf> {
  const now = args.now ?? new Date();
  const r = await client.interview.updateMany({
    where: { id: args.interviewId, status: "SCHEDULED" },
    data: { status: "CONFIRMED", confirmedAt: now },
  });
  if (r.count !== 1) return stateOrMissing(args.interviewId, client);
  const row = await client.interview.findUnique({
    where: { id: args.interviewId },
    select: {
      recommendation: {
        select: { seeker: { select: { user: { select: { phoneEnc: true, locale: true } } } } },
      },
    },
  });
  const user = row?.recommendation.seeker.user;
  if (user?.phoneEnc) {
    const locale = toLocale(user.locale);
    const provider = args.provider ?? getNotificationProvider();
    await provider.send({
      channel: "SMS",
      to: user.phoneEnc,
      templateKey: INTERVIEW_CONSENT_TEMPLATE,
      locale,
      params: { path: `/${locale}/seeker/me` },
    });
  }
  return { ok: true };
}

/** 면접 취소. The company stops seeing the real name at once (disclosure needs a live interview). */
export async function cancelInterview(
  args: { interviewId: string; now?: Date },
  client: Client = db,
): Promise<InterviewResultOf> {
  const r = await client.interview.updateMany({
    where: { id: args.interviewId, status: { not: "CANCELLED" } },
    data: { status: "CANCELLED", cancelledAt: args.now ?? new Date() },
  });
  return r.count === 1 ? { ok: true } : stateOrMissing(args.interviewId, client);
}

export async function recordInterviewResult(
  args: { interviewId: string; attended: boolean | null; result: InterviewResult | null },
  client: Client = db,
): Promise<InterviewResultOf> {
  const r = await client.interview.updateMany({
    where: { id: args.interviewId },
    data: { attended: args.attended, result: args.result },
  });
  return r.count === 1 ? { ok: true } : { ok: false, code: "NOT_FOUND" };
}

/**
 * 소개 확인서 upload (R-210). A new upload replaces the pointer; the earlier file stays in private
 * storage (no deletion — 소개 기록 보존, WO §11 [전문가 검토 필요]).
 */
export async function attachIntroConfirm(
  args: { interviewId: string; bytes: Uint8Array; now?: Date },
  client: Client = db,
): Promise<InterviewResultOf> {
  const exists = await client.interview.findUnique({
    where: { id: args.interviewId },
    select: { id: true },
  });
  if (!exists) return { ok: false, code: "NOT_FOUND" };
  const stored = await storeIntroConfirm(exists.id, args.bytes);
  if (!stored.ok) return stored;
  await client.interview.update({
    where: { id: exists.id },
    data: {
      introConfirmFile: stored.key,
      introConfirmMime: stored.mime,
      introConfirmUploadedAt: args.now ?? new Date(),
    },
  });
  return { ok: true };
}

/** A 5-minute signed URL of the 소개 확인서, bound to the staff member who asked for it. */
export async function introConfirmUrl(
  args: { interviewId: string; staffId: string; now?: Date },
  client: Client = db,
): Promise<string | null> {
  const row = await client.interview.findUnique({
    where: { id: args.interviewId },
    select: { introConfirmFile: true },
  });
  if (!row?.introConfirmFile) return null;
  return signedFileUrl(
    { key: row.introConfirmFile, userId: args.staffId, purpose: INTRO_CONFIRM_PURPOSE },
    args.now,
  );
}

/** Interviews of one recommendation (staff view). */
export function listInterviews(recommendationId: string, client: Client = db) {
  return client.interview.findMany({
    where: { recommendationId },
    orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      scheduledAt: true,
      place: true,
      interpreter: true,
      status: true,
      confirmedAt: true,
      cancelledAt: true,
      consentDeclinedAt: true,
      attended: true,
      result: true,
      introConfirmFile: true,
      introConfirmMime: true,
      introConfirmUploadedAt: true,
      consents: {
        where: { type: "THIRD_PARTY_INTERVIEW" },
        orderBy: { agreedAt: "desc" },
        select: { agreedAt: true, revokedAt: true },
      },
    },
  });
}
