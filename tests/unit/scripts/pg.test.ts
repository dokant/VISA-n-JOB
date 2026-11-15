/** PLAN A-9: destructive DB commands only target the local embedded cluster. */
import { describe, expect, it } from "vitest";

import {
  assertLocalDatabase,
  assertSafeDbName,
  buildDatabaseUrl,
  parseDatabaseUrl,
  resolveDataDir,
} from "../../../scripts/lib/pg";

describe("scripts/lib/pg", () => {
  it("parses and rebuilds a DATABASE_URL", () => {
    const cfg = parseDatabaseUrl("postgresql://postgres:p%40ss@127.0.0.1:54320/visanjob");
    expect(cfg).toEqual({
      host: "127.0.0.1",
      port: 54320,
      user: "postgres",
      password: "p@ss",
      database: "visanjob",
    });
    expect(buildDatabaseUrl(cfg)).toBe("postgresql://postgres:p%40ss@127.0.0.1:54320/visanjob");
  });

  it("A-9: accepts only localhost on the dev / test port", () => {
    expect(() =>
      assertLocalDatabase(parseDatabaseUrl("postgresql://u:p@127.0.0.1:54320/a")),
    ).not.toThrow();
    expect(() =>
      assertLocalDatabase(parseDatabaseUrl("postgresql://u:p@localhost:54329/a")),
    ).not.toThrow();
    expect(() =>
      assertLocalDatabase(parseDatabaseUrl("postgresql://u:p@db.example.com:54320/a")),
    ).toThrow(/not local/);
    expect(() =>
      assertLocalDatabase(parseDatabaseUrl("postgresql://u:p@127.0.0.1:5432/a")),
    ).toThrow(/port/);
  });

  it("rejects non-postgres URLs and unsafe database names", () => {
    expect(() => parseDatabaseUrl("mysql://u:p@127.0.0.1:3306/a")).toThrow();
    expect(() => assertSafeDbName("visanjob_test_1")).not.toThrow();
    expect(() => assertSafeDbName('x"; DROP DATABASE y; --')).toThrow();
    expect(() => assertSafeDbName("Upper")).toThrow();
  });

  it("resolves PG_DATA_DIR with %LOCALAPPDATA% expansion and a fallback", () => {
    expect(resolveDataDir(undefined, "/tmp/fallback")).toMatch(/fallback$/);
    expect(resolveDataDir("  ", "/tmp/fallback")).toMatch(/fallback$/);
    expect(resolveDataDir("%LOCALAPPDATA%/visanjob/pgdata", "/x")).not.toContain("%LOCALAPPDATA%");
  });
});
