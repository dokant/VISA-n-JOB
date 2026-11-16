/**
 * StaffTask rows created by seeker registration (PC-4, R-105, WO §7.4).
 *
 * - PROFILE_COMPLETION_NOTICE: "프로필 완성" notice after a quick signup (R-105). The notice is sent
 *   through the NotificationProvider (console adapter in development) and the task is closed.
 * - CONSULT: WO §7.4 D-10 / D-2 graduation window (VisaType autoConsult) and Step 6 wantsConsult.
 * - VISA_REVIEW: WO §7.4 E-7 계열 (VisaType needsVisaReview) — "행정사가 확인합니다".
 * Every task has a dedupe key, so saving the same step twice never creates a second task.
 * Payloads hold codes only, never personal data.
 */
import type { Prisma } from "@prisma/client";

import { PROFILE_COMPLETION_NOTICE_DELAY_SEC } from "@/config/limits";
import type { Locale } from "@/i18n/locales";
import { db } from "@/lib/db";
import { getNotificationProvider, type NotificationProvider } from "@/lib/notifications";

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

export const PROFILE_COMPLETION_TEMPLATE = "common.profileCompletion.sms";

export async function createRegistrationTasks(
  tx: Tx,
  args: {
    seekerId: string;
    autoConsult: boolean;
    needsVisaReview: boolean;
    wantsConsult?: boolean;
    now: Date;
  },
): Promise<void> {
  const rows: Prisma.StaffTaskCreateManyInput[] = [];
  if (args.autoConsult || args.wantsConsult) {
    rows.push({
      type: "CONSULT",
      assigneeRole: "STAFF_VISA",
      seekerId: args.seekerId,
      dueAt: args.now,
      dedupeKey: `CONSULT:REGISTRATION:${args.seekerId}`,
      payload: {
        reason: args.autoConsult ? "VISA_TRACK_AUTO_CONSULT" : "SEEKER_REQUEST",
      },
    });
  }
  if (args.needsVisaReview) {
    rows.push({
      type: "VISA_REVIEW",
      assigneeRole: "STAFF_VISA",
      seekerId: args.seekerId,
      dueAt: args.now,
      dedupeKey: `VISA_REVIEW:REGISTRATION:${args.seekerId}`,
      payload: { reason: "VISA_TYPE_NEEDS_REVIEW" },
    });
  }
  if (rows.length > 0) await tx.staffTask.createMany({ data: rows, skipDuplicates: true });
}

/** Creates the "프로필 완성" notice task inside the signup transaction (R-105). */
export async function createProfileCompletionTask(
  tx: Tx,
  args: { seekerId: string; locale: Locale; now: Date },
): Promise<string> {
  const task = await tx.staffTask.create({
    data: {
      type: "PROFILE_COMPLETION_NOTICE",
      seekerId: args.seekerId,
      dueAt: new Date(args.now.getTime() + PROFILE_COMPLETION_NOTICE_DELAY_SEC * 1000),
      dedupeKey: `PROFILE_COMPLETION_NOTICE:${args.seekerId}`,
      payload: { templateKey: PROFILE_COMPLETION_TEMPLATE, locale: args.locale },
    },
    select: { id: true },
  });
  return task.id;
}

/**
 * Sends the notice of a PROFILE_COMPLETION_NOTICE task to the seeker's phone and closes the task
 * when the provider accepted it. A failed send leaves the task OPEN for staff / a later job.
 */
export async function dispatchProfileCompletionNotice(args: {
  taskId: string;
  phone: string;
  locale: Locale;
  now?: Date;
  provider?: NotificationProvider;
}): Promise<boolean> {
  const provider = args.provider ?? getNotificationProvider();
  const result = await provider.send({
    channel: "SMS",
    to: args.phone,
    templateKey: PROFILE_COMPLETION_TEMPLATE,
    locale: args.locale,
    params: { path: `/${args.locale}/seeker/register` },
  });
  if (!result.ok) return false;
  await db.staffTask.update({
    where: { id: args.taskId },
    data: { status: "DONE", completedAt: args.now ?? new Date() },
  });
  return true;
}
