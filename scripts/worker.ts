/**
 * `pnpm worker` — pg-boss worker process (PLAN P1d 작업 3, R-116).
 *
 * Loads .env, starts pg-boss on DATABASE_URL (schema `pgboss`), registers the cron schedules of
 * src/lib/jobs/boss.ts (R-116 lead archive; R-213 status check, stay expiry, no-show recount) and
 * runs their handlers. Stops cleanly on Ctrl+C / SIGTERM.
 * Logs are JSON lines without personal data (STANDARD 5).
 */
import path from "node:path";

function log(entry: Record<string, unknown>): void {
  console.info(JSON.stringify({ at: new Date().toISOString(), ...entry }));
}

async function main(): Promise<void> {
  try {
    process.loadEnvFile(path.resolve(process.cwd(), ".env"));
  } catch {
    // no .env: rely on the process environment
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  // Imported after .env is loaded: src/lib/db.ts reads the environment at import time.
  const { PGBOSS_SCHEMA, SCHEDULED_JOBS, createBoss, registerSchedules, startWorkers } =
    await import("../src/lib/jobs/boss");
  // R-214: pick the notification adapters now, so the choice (`notification.provider`: SMTP enabled
  // or console) is in the log at start-up, before any job sends a message.
  const { getNotificationProvider } = await import("../src/lib/notifications");
  getNotificationProvider();

  const boss = createBoss(url);
  boss.on("error", (e: Error) => log({ event: "worker.error", message: e.message }));
  await boss.start();
  await registerSchedules(boss);
  await startWorkers(boss, SCHEDULED_JOBS, log);
  log({
    event: "worker.started",
    schema: PGBOSS_SCHEMA,
    jobs: SCHEDULED_JOBS.map((j) => ({ name: j.name, cron: j.cron, tz: j.tz })),
  });

  const stop = async (signal: string) => {
    log({ event: "worker.stopping", signal });
    await boss.stop({ graceful: true, timeout: 10_000 });
    process.exit(0);
  };
  process.once("SIGINT", () => void stop("SIGINT"));
  process.once("SIGTERM", () => void stop("SIGTERM"));
}

main().catch((e: unknown) => {
  log({ event: "worker.failed", message: e instanceof Error ? e.message : String(e) });
  process.exit(1);
});
