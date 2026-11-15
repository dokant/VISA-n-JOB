/**
 * pnpm db:start | db:stop | db:status | db:reset — local embedded Postgres (Q-02, R-004).
 *
 * - Cluster data: PG_DATA_DIR (default `<repo>/.pgdata`, git-ignored). If the repo path breaks
 *   initdb/pg_ctl (spaces, permissions), set PG_DATA_DIR=%LOCALAPPDATA%\visanjob\pgdata.
 * - Connection (port, user, password, database) comes from DATABASE_URL (.env). Dev port 54320.
 * - The server runs detached through pg_ctl, so it survives this script; stop it with db:stop.
 * - db:reset drops and recreates the database, then applies migrations and the seed.
 *   It refuses anything that is not the local embedded cluster (PLAN A-9).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import EmbeddedPostgres from "embedded-postgres";

import {
  type PgConfig,
  assertLocalDatabase,
  assertSafeDbName,
  loadDotEnv,
  parseDatabaseUrl,
  pgBinary,
  resolveDataDir,
} from "./lib/pg";

const ROOT = path.resolve(__dirname, "..");

function config(): { cfg: PgConfig; dataDir: string } {
  loadDotEnv(ROOT);
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");
  }
  const cfg = parseDatabaseUrl(url);
  const dataDir = resolveDataDir(process.env.PG_DATA_DIR, path.join(ROOT, ".pgdata"));
  return { cfg, dataDir };
}

function cluster(cfg: PgConfig, dataDir: string): EmbeddedPostgres {
  return new EmbeddedPostgres({
    databaseDir: dataDir,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    authMethod: "scram-sha-256",
    persistent: true,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    onLog: () => undefined,
    onError: (e) => console.error("[db]", e),
  });
}

function isRunning(dataDir: string): boolean {
  if (!existsSync(path.join(dataDir, "PG_VERSION"))) return false;
  const r = spawnSync(pgBinary("pg_ctl"), ["status", "-D", dataDir], { stdio: "ignore" });
  return r.status === 0;
}

async function withAdminClient<T>(
  cfg: PgConfig,
  dataDir: string,
  fn: (
    q: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>,
  ) => Promise<T>,
): Promise<T> {
  const client = cluster(cfg, dataDir).getPgClient("postgres", cfg.host);
  await client.connect();
  try {
    return await fn((sql, params) => client.query(sql, params));
  } finally {
    await client.end();
  }
}

async function ensureDatabase(cfg: PgConfig, dataDir: string): Promise<void> {
  assertSafeDbName(cfg.database);
  await withAdminClient(cfg, dataDir, async (q) => {
    const r = await q("SELECT 1 FROM pg_database WHERE datname = $1", [cfg.database]);
    if (r.rows.length === 0) {
      await q(`CREATE DATABASE ${cfg.database}`);
      console.log(`[db] created database ${cfg.database}`);
    }
  });
}

async function start(): Promise<void> {
  const { cfg, dataDir } = config();
  if (!existsSync(path.join(dataDir, "PG_VERSION"))) {
    console.log(`[db] initialising cluster in ${dataDir}`);
    mkdirSync(path.dirname(dataDir), { recursive: true });
    await cluster(cfg, dataDir).initialise();
  }
  if (isRunning(dataDir)) {
    console.log(`[db] already running (${dataDir})`);
  } else {
    const logFile = path.join(dataDir, "server.log");
    const r = spawnSync(
      pgBinary("pg_ctl"),
      [
        "start",
        "-s",
        "-D",
        dataDir,
        "-l",
        logFile,
        "-w",
        "-t",
        "60",
        "-o",
        `-p ${cfg.port} -h 127.0.0.1`,
      ],
      { stdio: "inherit" },
    );
    if (r.status !== 0) {
      throw new Error(`pg_ctl start failed (exit ${r.status}). See ${logFile}`);
    }
  }
  await ensureDatabase(cfg, dataDir);
  console.log(`[db] ready on 127.0.0.1:${cfg.port}, database ${cfg.database}, data ${dataDir}`);
}

function stop(): void {
  const { dataDir } = config();
  if (!isRunning(dataDir)) {
    console.log("[db] not running");
    return;
  }
  const r = spawnSync(pgBinary("pg_ctl"), ["stop", "-s", "-D", dataDir, "-m", "fast", "-w"], {
    stdio: "inherit",
  });
  if (r.status !== 0) throw new Error(`pg_ctl stop failed (exit ${r.status})`);
  console.log("[db] stopped");
}

function status(): void {
  const { cfg, dataDir } = config();
  console.log(
    `[db] ${isRunning(dataDir) ? "running" : "stopped"} — port ${cfg.port}, data ${dataDir}`,
  );
}

function prismaCli(): string {
  return path.join(path.dirname(require.resolve("prisma/package.json")), "build", "index.js");
}

function runNode(args: string[]): void {
  const r = spawnSync(process.execPath, args, { stdio: "inherit", cwd: ROOT, env: process.env });
  if (r.status !== 0) throw new Error(`command failed: ${args.join(" ")}`);
}

async function reset(): Promise<void> {
  const { cfg, dataDir } = config();
  assertLocalDatabase(cfg);
  assertSafeDbName(cfg.database);
  if (!isRunning(dataDir)) throw new Error("Database is not running. Run db:start first.");
  await withAdminClient(cfg, dataDir, async (q) => {
    await q(`DROP DATABASE IF EXISTS ${cfg.database} WITH (FORCE)`);
    await q(`CREATE DATABASE ${cfg.database}`);
  });
  console.log(`[db] recreated database ${cfg.database}`);
  runNode([prismaCli(), "migrate", "deploy"]);
  runNode([require.resolve("tsx/cli"), path.join(ROOT, "prisma", "seed", "index.ts")]);
}

async function main(): Promise<void> {
  const cmd = process.argv[2];
  switch (cmd) {
    case "start":
      return start();
    case "stop":
      return stop();
    case "status":
      return status();
    case "reset":
      return reset();
    default:
      throw new Error("usage: tsx scripts/db.ts <start|stop|status|reset>");
  }
}

main().catch((e: unknown) => {
  console.error(`[db] ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
