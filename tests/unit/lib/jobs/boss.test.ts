/**
 * R-116 / PLAN P1d 작업 3: pg-boss runs in its own schema `pgboss`, the cron schedule is registered
 * and a queued job is delivered to the handler with a `now`. No real waiting: the job is sent and
 * fetched directly (PLAN 위험 "pg-boss는 스케줄 등록·큐 적재만 별도 통합 테스트").
 */
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import {
  LEAD_ARCHIVE_CRON,
  LEAD_JOB_TIMEZONE,
  NO_SHOW_SYNC_CRON,
  STATUS_CHECK_CRON,
  STAY_EXPIRY_CRON,
} from "@/config/limits";
import {
  PGBOSS_SCHEMA,
  SCHEDULED_JOBS,
  type ScheduledJob,
  createBoss,
  registerSchedules,
  runJob,
} from "@/lib/jobs/boss";

import { testPrisma } from "../../db/helpers";

const prisma = testPrisma();
const boss = createBoss(inject("databaseUrl"));

beforeAll(async () => {
  await boss.start();
}, 60_000);
afterAll(async () => {
  await boss.stop({ graceful: false, wait: true });
  await prisma.$disconnect();
});

describe("R-116 pg-boss", () => {
  it("creates its tables in the separate `pgboss` schema, not in public", async () => {
    const rows = await prisma.$queryRaw<Array<{ table_schema: string }>>`
      SELECT DISTINCT table_schema FROM information_schema.tables WHERE table_name = 'job'`;
    expect(rows.map((r) => r.table_schema)).toContain(PGBOSS_SCHEMA);
    expect(rows.map((r) => r.table_schema)).not.toContain("public");
  });

  it("registers the archive job with its cron and time zone (idempotent)", async () => {
    await registerSchedules(boss);
    await registerSchedules(boss);
    const schedules = await boss.getSchedules();
    const archive = schedules.filter((s) => s.name === "leads.archive-stale");
    expect(archive).toHaveLength(1);
    expect(archive[0]).toMatchObject({ cron: LEAD_ARCHIVE_CRON, timezone: LEAD_JOB_TIMEZONE });
    expect(SCHEDULED_JOBS.map((j) => j.name)).toEqual([
      "leads.archive-stale",
      "seekers.status-check",
      "seekers.stay-expiry",
      "seekers.no-show-sync",
    ]);
  });

  it("R-213: the status-check, stay-expiry and no-show jobs are scheduled once each, in Korean time", async () => {
    await registerSchedules(boss);
    const schedules = await boss.getSchedules();
    for (const [name, cron] of [
      ["seekers.status-check", STATUS_CHECK_CRON],
      ["seekers.stay-expiry", STAY_EXPIRY_CRON],
      ["seekers.no-show-sync", NO_SHOW_SYNC_CRON],
    ] as const) {
      const rows = schedules.filter((s) => s.name === name);
      expect(rows, name).toHaveLength(1);
      expect(rows[0]).toMatchObject({ cron, timezone: "Asia/Seoul" });
    }
  });

  it("a queued job reaches the pure handler, which receives the delivery time as `now`", async () => {
    const seen: Date[] = [];
    const job: ScheduledJob = {
      name: "test.p1d-handler",
      cron: "0 0 1 1 *",
      tz: "UTC",
      handler: async (now) => {
        seen.push(now);
        return { ok: true };
      },
    };
    await boss.createQueue(job.name);
    const id = await boss.send(job.name, {});
    expect(id).toBeTruthy();
    const [fetched] = await boss.fetch(job.name);
    expect(fetched?.id).toBe(id);

    const now = new Date("2031-01-01T00:00:00Z");
    const logs: Record<string, unknown>[] = [];
    expect(await runJob(job, now, (e) => logs.push(e))).toEqual({ ok: true });
    await boss.complete(job.name, fetched.id);
    expect(seen).toEqual([now]);
    expect(logs[0]).toMatchObject({ event: "job.done", job: job.name, result: { ok: true } });
  });
});
