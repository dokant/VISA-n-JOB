import { PrismaClient } from "@prisma/client";
import { inject } from "vitest";

/** Prisma client bound to the per-run test database created by tests/setup/global-db.ts. */
export function testPrisma(): PrismaClient {
  return new PrismaClient({ datasourceUrl: inject("databaseUrl") });
}

let seq = 0;
/** Unique suffix for rows created by a test (the DB is shared within one run and never cleaned). */
export function uniq(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${process.pid}-${seq}`;
}
