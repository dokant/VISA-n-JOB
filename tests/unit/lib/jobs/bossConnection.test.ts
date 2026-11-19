/**
 * DECISIONS Q-31: the worker connects to the compose PostgreSQL container (host `db`) without TLS
 * when no CA file is present; any other database keeps what its URL says (sslmode=require).
 */
import { describe, expect, it } from "vitest";

import { bossConnectionOptions } from "@/lib/jobs/boss";

const INTERNAL = "postgresql://visanjob:pw@db:5432/visanjob";
const MANAGED = "postgresql://app:pw@managed.example.internal:5432/visanjob?sslmode=require";

describe("Q-31 pg-boss connection options", () => {
  it("Q-31: internal db without a CA file → TLS off", () => {
    expect(bossConnectionOptions(INTERNAL, undefined, () => false)).toEqual({
      connectionString: INTERNAL,
      ssl: false,
    });
    expect(bossConnectionOptions(INTERNAL, "/certs/db-ca.pem", () => false).ssl).toBe(false);
  });

  it("Q-31: internal db with a CA file present → the URL decides", () => {
    expect(bossConnectionOptions(INTERNAL, "/certs/db-ca.pem", () => true)).toEqual({
      connectionString: INTERNAL,
    });
  });

  it("Q-31: an external database never gets TLS turned off, with or without a CA file", () => {
    expect(bossConnectionOptions(MANAGED, undefined, () => false)).toEqual({
      connectionString: MANAGED,
    });
    expect(bossConnectionOptions(MANAGED, "/certs/db-ca.pem", () => true)).toEqual({
      connectionString: MANAGED,
    });
    // A host that merely starts with "db" is external.
    const lookalike = "postgresql://u:p@db.example.com:5432/x?sslmode=require";
    expect(bossConnectionOptions(lookalike, undefined, () => false).ssl).toBeUndefined();
    // The local development cluster is not the internal container either.
    const dev = "postgresql://u:p@127.0.0.1:54320/visanjob";
    expect(bossConnectionOptions(dev, undefined, () => false).ssl).toBeUndefined();
  });

  it("Q-31: an unparsable URL is passed through unchanged", () => {
    expect(bossConnectionOptions("not a url", undefined, () => false)).toEqual({
      connectionString: "not a url",
    });
  });
});
