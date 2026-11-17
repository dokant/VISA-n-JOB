/**
 * 30일 주기 상태 확인 (PRD R-213, WO §7.7). Pure job handler `(now) => Promise<Result>`: the clock is a
 * parameter, so tests move time without pg-boss (PLAN 위험 "pg-boss 시간 조작").
 *
 * One run does two things, in this order:
 * 1. 무응답 처리 — a check sent STATUS_CHECK_REPLY_DAYS (14) days ago or earlier and still open
 *    (`statusCheckSentAt` set; answering clears it):
 *    - delivered on a real channel (`statusCheckDeliveredReal`, DECISIONS Q-27): the seeker turns
 *      INACTIVE; an S seeker becomes A with AuditLog SEEKER_GRADE_CHANGE (actor SYSTEM, BR-15) in the
 *      same transaction.
 *    - console only (SIMULATED, nobody received it): status and grade stay; the check is only closed
 *      and counted (`simulatedExpired`, one `status_check.simulated` log line per run), so
 *      the seeker can be asked again — on a real channel once one exists.
 *    Either way the open check is closed (`statusCheckSentAt = null`), so a later reactivation by
 *    staff starts clean.
 * 2. 발송 — an ACTIVE, JOB_MATCH seeker who is still looking for work (구직 상태 not NOT_SEARCHING)
 *    and whose last confirmation (`lastActiveConfirmedAt`) is STATUS_CHECK_INTERVAL_DAYS (30) days old
 *    or older, with no open check, gets "아직 구직 중이세요?" with the one-click link
 *    (src/lib/seeker/stillSearching.ts). `statusCheckSentAt = now` is claimed first (guarded), the
 *    message goes out on SMS and e-mail (notifySeeker); `statusCheckDeliveredReal` records whether a
 *    real channel accepted it. When no channel accepted it the claim is released so the next run
 *    tries again.
 * Every change is guarded on the values it read, so two overlapping runs do not double-send or
 * double-demote. Messages carry no personal data beyond the recipient (the link holds the profile id
 * only).
 */
import type { Prisma } from "@prisma/client";

import {
  SEEKER_JOB_BATCH,
  STATUS_CHECK_INTERVAL_DAYS,
  STATUS_CHECK_REPLY_DAYS,
} from "@/config/limits";
import { getSiteConfig } from "@/config/site.config";
import { SYSTEM_ACTOR, writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { getNotificationProvider, type NotificationProvider } from "@/lib/notifications";
import { signStillSearchingToken, stillSearchingPath } from "@/lib/seeker/stillSearching";

import { notifySeeker, seekerLocale } from "./notifySeeker";

type Client = typeof db;

const DAY_MS = 86_400_000;

/** messages `common.statusCheck.{sms,email}` */
export const STATUS_CHECK_TOPIC = "common.statusCheck";

export type StatusCheckResult = {
  /** Checks delivered (real or console). */
  sent: number;
  /** Of `sent`, checks no real channel accepted (console only, Q-27). */
  sentSimulated: number;
  failed: number;
  inactivated: number;
  demoted: number;
  /** Console-only checks whose window passed: closed without a status change (Q-27). */
  simulatedExpired: number;
};

export type JobLog = (line: string) => void;

export type JobOptions = {
  /** Narrows the seekers (tests run against a shared database); the scheduled job passes nothing. */
  scope?: Prisma.SeekerProfileWhereInput;
  client?: Client;
  provider?: NotificationProvider;
  /** Origin of the link; default SITE_URL (site.config). */
  siteUrl?: string;
  /** JSON log line sink; default console.warn (the only line it writes is the `level: "warn"` one). */
  log?: JobLog;
};

/** Open checks whose 14-day answer window has passed at `now`. */
export function noReplyWhere(now: Date): Prisma.SeekerProfileWhereInput {
  return {
    status: "ACTIVE",
    statusCheckSentAt: { lte: new Date(now.getTime() - STATUS_CHECK_REPLY_DAYS * DAY_MS) },
  };
}

/** Seekers due for a new "아직 구직 중이세요?" at `now`. */
export function statusCheckDueWhere(now: Date): Prisma.SeekerProfileWhereInput {
  return {
    status: "ACTIVE",
    track: "JOB_MATCH",
    statusCheckSentAt: null,
    lastActiveConfirmedAt: {
      lte: new Date(now.getTime() - STATUS_CHECK_INTERVAL_DAYS * DAY_MS),
    },
    OR: [{ jobSearchStatus: null }, { jobSearchStatus: { not: "NOT_SEARCHING" } }],
  };
}

async function expireNoReplies(
  now: Date,
  scope: Prisma.SeekerProfileWhereInput,
  client: Client,
  result: StatusCheckResult,
): Promise<void> {
  const skipped = new Set<string>();
  for (;;) {
    const batch = await client.seekerProfile.findMany({
      where: { AND: [noReplyWhere(now), scope, { id: { notIn: [...skipped] } }] },
      select: { id: true, grade: true, statusCheckSentAt: true, statusCheckDeliveredReal: true },
      orderBy: { statusCheckSentAt: "asc" },
      take: SEEKER_JOB_BATCH,
    });
    if (batch.length === 0) return;
    for (const row of batch) {
      if (!row.statusCheckDeliveredReal) {
        // Q-27: nobody received a console-only check, so its silence is not a "no": close it only.
        const { count } = await client.seekerProfile.updateMany({
          where: {
            id: row.id,
            status: "ACTIVE",
            statusCheckSentAt: row.statusCheckSentAt,
            statusCheckDeliveredReal: false,
          },
          data: { statusCheckSentAt: null },
        });
        if (count === 0) skipped.add(row.id);
        else result.simulatedExpired += 1;
        continue;
      }
      const demote = row.grade === "S";
      const changed = await client.$transaction(async (tx) => {
        const { count } = await tx.seekerProfile.updateMany({
          where: {
            id: row.id,
            status: "ACTIVE",
            grade: row.grade,
            statusCheckSentAt: row.statusCheckSentAt,
            statusCheckDeliveredReal: true,
          },
          data: {
            status: "INACTIVE",
            statusCheckSentAt: null,
            statusCheckDeliveredReal: false,
            ...(demote ? { grade: "A" } : {}),
          },
        });
        if (count === 0) return false;
        if (demote) {
          await writeAudit(
            {
              actorId: SYSTEM_ACTOR,
              action: "SEEKER_GRADE_CHANGE",
              entity: "SeekerProfile",
              entityId: row.id,
              meta: { from: "S", to: "A", reason: "STATUS_CHECK_NO_REPLY", status: "INACTIVE" },
            },
            tx,
          );
        }
        return true;
      });
      if (!changed) {
        skipped.add(row.id); // answered or changed meanwhile
        continue;
      }
      result.inactivated += 1;
      if (demote) result.demoted += 1;
    }
  }
}

async function sendChecks(
  now: Date,
  scope: Prisma.SeekerProfileWhereInput,
  client: Client,
  provider: NotificationProvider,
  siteUrl: string,
  result: StatusCheckResult,
): Promise<void> {
  const done = new Set<string>();
  for (;;) {
    const batch = await client.seekerProfile.findMany({
      where: { AND: [statusCheckDueWhere(now), scope, { id: { notIn: [...done] } }] },
      select: { id: true, emailEnc: true, user: { select: { phoneEnc: true, locale: true } } },
      orderBy: { lastActiveConfirmedAt: "asc" },
      take: SEEKER_JOB_BATCH,
    });
    if (batch.length === 0) return;
    for (const row of batch) {
      done.add(row.id);
      const claim = await client.seekerProfile.updateMany({
        where: { id: row.id, status: "ACTIVE", statusCheckSentAt: null },
        data: { statusCheckSentAt: now, statusCheckDeliveredReal: false },
      });
      if (claim.count === 0) continue;
      const locale = seekerLocale(row.user.locale);
      const token = signStillSearchingToken(row.id, now);
      const { delivered, deliveredReal } = await notifySeeker(
        provider,
        { phone: row.user.phoneEnc, email: row.emailEnc, locale },
        STATUS_CHECK_TOPIC,
        { url: `${siteUrl}${stillSearchingPath(locale, token)}`, days: STATUS_CHECK_REPLY_DAYS },
      );
      if (delivered > 0) {
        result.sent += 1;
        if (deliveredReal > 0) {
          // Q-27: at least one real channel — the 14-day no-reply transition applies to this check.
          await client.seekerProfile.updateMany({
            where: { id: row.id, statusCheckSentAt: now },
            data: { statusCheckDeliveredReal: true },
          });
        } else {
          result.sentSimulated += 1;
        }
        continue;
      }
      // Nothing delivered: release the claim so the 14-day window does not run without a message.
      await client.seekerProfile.updateMany({
        where: { id: row.id, statusCheckSentAt: now },
        data: { statusCheckSentAt: null },
      });
      result.failed += 1;
    }
  }
}

export async function runStatusCheck(
  now: Date,
  options: JobOptions = {},
): Promise<StatusCheckResult> {
  const client = options.client ?? db;
  const scope = options.scope ?? {};
  const log: JobLog = options.log ?? ((line) => console.warn(line));
  const result: StatusCheckResult = {
    sent: 0,
    sentSimulated: 0,
    failed: 0,
    inactivated: 0,
    demoted: 0,
    simulatedExpired: 0,
  };
  await expireNoReplies(now, scope, client, result);
  await sendChecks(
    now,
    scope,
    client,
    options.provider ?? getNotificationProvider(),
    options.siteUrl ?? getSiteConfig().siteUrl,
    result,
  );
  if (result.simulatedExpired > 0 || result.sentSimulated > 0) {
    // Q-27: counts only (no ids or contact data).
    log(
      JSON.stringify({
        level: "warn",
        event: "status_check.simulated",
        sentSimulated: result.sentSimulated,
        simulatedExpired: result.simulatedExpired,
        note: "console-only checks: no INACTIVE / S→A for their no-reply",
      }),
    );
  }
  return result;
}
