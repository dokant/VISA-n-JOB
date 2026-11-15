/**
 * Vitest globalSetup — test database (PLAN P0b step 5).
 *
 * - Starts a separate embedded Postgres cluster on 127.0.0.1:54329 (data: PG_TEST_DATA_DIR,
 *   default `<repo>/.pgdata-test`). It is stopped when the run ends.
 * - Every run creates a brand-new database, applies migrations (`prisma migrate deploy`) and seeds.
 *   Ledger tables reject DELETE/TRUNCATE (BR-09), so cleanup is "drop the whole database",
 *   never row deletion.
 * - Tests read the URL from `inject("databaseUrl")`; process.env.DATABASE_URL is set as well so
 *   `src/lib/db.ts` points at the test database inside workers.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import EmbeddedPostgres from "embedded-postgres";
import type { TestProject } from "vitest/node";

import { runSeed } from "../../prisma/seed/index";
import {
  type PgConfig,
  TEST_PORT,
  assertLocalDatabase,
  assertSafeDbName,
  buildDatabaseUrl,
  loadDotEnv,
  resolveDataDir,
} from "../../scripts/lib/pg";

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

const ROOT = process.cwd();
const TEST_DB_PREFIX = "visanjob_test_";

function prismaCli(): string {
  const req = createRequire(path.join(ROOT, "package.json"));
  return path.join(path.dirname(req.resolve("prisma/package.json")), "build", "index.js");
}

export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  loadDotEnv(ROOT);
  const dataDir = resolveDataDir(process.env.PG_TEST_DATA_DIR, path.join(ROOT, ".pgdata-test"));
  const base: PgConfig = {
    host: "127.0.0.1",
    port: TEST_PORT,
    user: "postgres",
    password: "postgres", // local throw-away test cluster only
    database: `${TEST_DB_PREFIX}${Date.now().toString(36)}_${process.pid}`,
  };
  assertLocalDatabase(base);
  assertSafeDbName(base.database);

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    port: base.port,
    user: base.user,
    password: base.password,
    authMethod: "scram-sha-256",
    persistent: true,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    postgresFlags: ["-h", "127.0.0.1"],
    onLog: () => undefined,
    onError: () => undefined,
  });
  if (!existsSync(path.join(dataDir, "PG_VERSION"))) {
    mkdirSync(path.dirname(dataDir), { recursive: true });
    await pg.initialise();
  }
  await pg.start();

  const admin = pg.getPgClient("postgres", base.host);
  await admin.connect();
  try {
    // Leftovers from runs that crashed before teardown.
    const stale = await admin.query<{ datname: string }>(
      "SELECT datname FROM pg_database WHERE datname LIKE $1",
      [`${TEST_DB_PREFIX}%`],
    );
    for (const { datname } of stale.rows) {
      assertSafeDbName(datname);
      await admin.query(`DROP DATABASE IF EXISTS ${datname} WITH (FORCE)`);
    }
    await admin.query(`CREATE DATABASE ${base.database}`);
  } finally {
    await admin.end();
  }

  const url = buildDatabaseUrl(base);
  const migrate = spawnSync(process.execPath, [prismaCli(), "migrate", "deploy"], {
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL: url },
    encoding: "utf8",
  });
  if (migrate.status !== 0) {
    await pg.stop();
    throw new Error(`prisma migrate deploy failed:\n${migrate.stdout}\n${migrate.stderr}`);
  }

  const prisma = new PrismaClient({ datasourceUrl: url });
  try {
    await runSeed(prisma);
  } finally {
    await prisma.$disconnect();
  }

  process.env.DATABASE_URL = url;
  project.provide("databaseUrl", url);

  return async () => {
    const c = pg.getPgClient("postgres", base.host);
    try {
      await c.connect();
      await c.query(`DROP DATABASE IF EXISTS ${base.database} WITH (FORCE)`);
    } finally {
      await c.end().catch(() => undefined);
      await pg.stop();
    }
  };
}
