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

import { LEAD_ARCHIVE_CRON, LEAD_JOB_TIMEZONE } from "@/config/limits";

import { archiveStaleLeads } from "./archiveLeads";

export const PGBOSS_SCHEMA = "pgboss";

export type JobHandler<R = unknown> = (now: Date) => Promise<R>;

export type ScheduledJob = {
  /** pg-boss queue name. */
  name: string;
  cron: string;
  tz: string;
  handler: JobHandler;
};

/** Every scheduled job of the app. P2d adds the R-213 jobs here. */
export const SCHEDULED_JOBS: readonly ScheduledJob[] = [
  {
    name: "leads.archive-stale",
    cron: LEAD_ARCHIVE_CRON,
    tz: LEAD_JOB_TIMEZONE,
    handler: archiveStaleLeads,
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
