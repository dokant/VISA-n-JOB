/**
 * pg-boss setup (WO §3, R-116; PLAN P1d 작업 3).
 *
 * - pg-boss keeps its tables in a separate Postgres schema `pgboss`, so Prisma migrations of the
 *   `public` schema never see them.
 * - Business logic lives in pure handlers `(now: Date) => Promise<Result>` (e.g. archiveLeads.ts).
 *   pg-boss only schedules and delivers; the worker passes the delivery time as `now`.
 * - Only the worker process (`pnpm worker`, scripts/worker.ts) starts pg-boss. The web app does not.
 */
import PgBoss from "pg-boss";

import {
  LEAD_ARCHIVE_CRON,
  LEAD_JOB_TIMEZONE,
  NO_SHOW_SYNC_CRON,
  STATUS_CHECK_CRON,
  STAY_EXPIRY_CRON,
} from "@/config/limits";

import { archiveStaleLeads } from "./archiveLeads";
import { syncNoShowCounts } from "./noShow";
import { runStatusCheck } from "./statusCheck";
import { runStayExpiryAlerts } from "./stayExpiry";

export const PGBOSS_SCHEMA = "pgboss";

export type JobHandler<R = unknown> = (now: Date) => Promise<R>;

export type ScheduledJob = {
  /** pg-boss queue name. */
  name: string;
  cron: string;
  tz: string;
  handler: JobHandler;
};

/** Every scheduled job of the app (R-116, R-213). Times are Korean (LEAD_JOB_TIMEZONE). */
export const SCHEDULED_JOBS: readonly ScheduledJob[] = [
  {
    name: "leads.archive-stale",
    cron: LEAD_ARCHIVE_CRON,
    tz: LEAD_JOB_TIMEZONE,
    handler: archiveStaleLeads,
  },
  {
    // R-213: 30일 주기 상태 확인 + 14일 무응답 → INACTIVE (S → A)
    name: "seekers.status-check",
    cron: STATUS_CHECK_CRON,
    tz: LEAD_JOB_TIMEZONE,
    handler: (now) => runStatusCheck(now),
  },
  {
    // R-213: 체류 만료 D-90 / D-60 / D-30 알림 + 행정사 업무 (StaffTask STAY_EXPIRY)
    name: "seekers.stay-expiry",
    cron: STAY_EXPIRY_CRON,
    tz: LEAD_JOB_TIMEZONE,
    handler: (now) => runStayExpiryAlerts(now),
  },
  {
    // R-213: 노쇼 횟수 재계산 (추천 우선순위 하향의 근거)
    name: "seekers.no-show-sync",
    cron: NO_SHOW_SYNC_CRON,
    tz: LEAD_JOB_TIMEZONE,
    handler: (now) => syncNoShowCounts(now),
  },
];

export function createBoss(connectionString: string): PgBoss {
  return new PgBoss({ connectionString, schema: PGBOSS_SCHEMA });
}

/** Creates the queues and their cron schedules (idempotent: safe on every worker start). */
export async function registerSchedules(
  boss: PgBoss,
  jobs: readonly ScheduledJob[] = SCHEDULED_JOBS,
): Promise<void> {
  for (const job of jobs) {
    await boss.createQueue(job.name);
    await boss.schedule(job.name, job.cron, {}, { tz: job.tz });
  }
}

export type JobLog = (entry: Record<string, unknown>) => void;

/**
 * Runs one delivered job: calls the handler with the delivery time. Kept separate from `boss.work`
 * so tests can call it directly.
 */
export async function runJob(
  job: ScheduledJob,
  now: Date = new Date(),
  log?: JobLog,
): Promise<unknown> {
  const started = Date.now();
  const result = await job.handler(now);
  log?.({ event: "job.done", job: job.name, ms: Date.now() - started, result });
  return result;
}

/** Subscribes a worker to every scheduled queue. */
export async function startWorkers(
  boss: PgBoss,
  jobs: readonly ScheduledJob[] = SCHEDULED_JOBS,
  log?: JobLog,
): Promise<void> {
  for (const job of jobs) {
    await boss.work(job.name, async () => {
      await runJob(job, new Date(), log);
    });
  }
}
