/**
 * Shared helpers for the local embedded Postgres (Q-02, R-004).
 * Used by scripts/db.ts (dev cluster, port 54320) and tests/setup/global-db.ts (test cluster, port 54329).
 */
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

export const DEV_PORT = 54320;
export const TEST_PORT = 54329;
export const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

export type PgConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

/** Loads `.env` from the repo root when present (Node 21.7+ built-in, no dotenv dependency). */
export function loadDotEnv(root = process.cwd()): void {
  const file = path.join(root, ".env");
  if (existsSync(file)) process.loadEnvFile(file);
}

export function parseDatabaseUrl(url: string): PgConfig {
  const u = new URL(url);
  if (u.protocol !== "postgresql:" && u.protocol !== "postgres:") {
    throw new Error(`DATABASE_URL must be a postgresql:// URL (got ${u.protocol})`);
  }
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 5432,
    user: decodeURIComponent(u.username || "postgres"),
    password: decodeURIComponent(u.password || ""),
    database: decodeURIComponent(u.pathname.replace(/^\//, "")) || "postgres",
  };
}

export function buildDatabaseUrl(cfg: PgConfig): string {
  const user = encodeURIComponent(cfg.user);
  const pass = encodeURIComponent(cfg.password);
  return `postgresql://${user}:${pass}@${cfg.host}:${cfg.port}/${encodeURIComponent(cfg.database)}`;
}

/**
 * A-9 guard: destructive commands (db:reset, test DB drop) only run against the local embedded
 * cluster. Anything that is not 127.0.0.1/localhost on the dev or test port is refused.
 */
export function assertLocalDatabase(cfg: PgConfig): void {
  if (!LOCAL_HOSTS.has(cfg.host)) {
    throw new Error(`Refusing destructive command: host "${cfg.host}" is not local (A-9).`);
  }
  if (cfg.port !== DEV_PORT && cfg.port !== TEST_PORT) {
    throw new Error(
      `Refusing destructive command: port ${cfg.port} is not the embedded dev (${DEV_PORT}) or test (${TEST_PORT}) port (A-9).`,
    );
  }
}

/** Only plain lower-case identifiers are used for database names (no quoting games). */
export function assertSafeDbName(name: string): void {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(name)) {
    throw new Error(`Unsafe database name: ${name}`);
  }
}

/** Default data directory: PG_DATA_DIR, else `<repo>/.pgdata`. */
export function resolveDataDir(envValue: string | undefined, fallback: string): string {
  const raw = envValue && envValue.trim() !== "" ? envValue : fallback;
  const expanded = raw.replace(/%LOCALAPPDATA%/gi, process.env.LOCALAPPDATA ?? os.homedir());
  return path.resolve(expanded);
}

/** Path to the platform binaries shipped by @embedded-postgres/<platform>. */
export function resolvePgBinDir(): string {
  const req = createRequire(path.join(process.cwd(), "package.json"));
  const epEntry = req.resolve("embedded-postgres");
  const epReq = createRequire(epEntry);
  const platformPkg = `@embedded-postgres/${platformPackageSuffix()}`;
  const entry = epReq.resolve(platformPkg);
  return path.resolve(path.dirname(entry), "..", "native", "bin");
}

function platformPackageSuffix(): string {
  const p = os.platform();
  const a = os.arch();
  if (p === "win32") return `windows-${a}`;
  if (p === "darwin") return `darwin-${a}`;
  return `linux-${a}`;
}

export function pgBinary(name: "pg_ctl" | "postgres" | "initdb"): string {
  const ext = os.platform() === "win32" ? ".exe" : "";
  return path.join(resolvePgBinDir(), `${name}${ext}`);
}
