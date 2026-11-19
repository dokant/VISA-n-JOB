/**
 * A-8 deployment: scripts/gen-secrets.ts fills production secrets in the development key formats
 * (DECISIONS Q-08), keeps values that are already set, and prints names only.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { INGEST_API_KEY_MIN_LENGTH, PASSWORD_MIN_LENGTH } from "@/config/limits";

import { SECRET_GENERATORS, fillSecrets, writeSecrets } from "../../../scripts/gen-secrets";

function parse(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

describe("A-8 gen-secrets", () => {
  it("A-8 / Q-08: generated values use the .env.example formats", () => {
    const env = parse(fillSecrets("").text);
    expect(Object.keys(SECRET_GENERATORS).every((k) => env[k])).toBe(true);
    expect(env.ENCRYPTION_KEYS).toMatch(/^1:[A-Za-z0-9+/]{43}=$/);
    expect(Buffer.from(env.ENCRYPTION_KEYS.slice(2), "base64")).toHaveLength(32);
    expect(Buffer.from(env.HASH_KEY, "base64")).toHaveLength(32);
    expect(Buffer.from(env.AUTH_SECRET, "base64")).toHaveLength(32);
    expect(env.INGEST_API_KEY).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(env.INGEST_API_KEY.length).toBeGreaterThanOrEqual(INGEST_API_KEY_MIN_LENGTH);
    expect(env.SEED_ADMIN_PASSWORD.length).toBeGreaterThanOrEqual(PASSWORD_MIN_LENGTH);
    // Fresh values every run.
    expect(parse(fillSecrets("").text).HASH_KEY).not.toBe(env.HASH_KEY);
  });

  it("A-8: fills empty variables in place, keeps set ones and other lines", () => {
    const input = [
      "# header",
      "SITE_URL=https://staging.visanjob.co.kr",
      "AUTH_SECRET=",
      'HASH_KEY="already-set"',
      "ENCRYPTION_KEYS= # fill me",
      "",
    ].join("\n");
    const { text, generated, kept } = fillSecrets(input);
    const env = parse(text);
    expect(text.startsWith("# header\nSITE_URL=https://staging.visanjob.co.kr\n")).toBe(true);
    expect(env.HASH_KEY).toBe('"already-set"');
    expect(kept).toEqual(["HASH_KEY"]);
    expect(generated.sort()).toEqual(
      ["AUTH_SECRET", "ENCRYPTION_KEYS", "INGEST_API_KEY", "SEED_ADMIN_PASSWORD"].sort(),
    );
    expect(env.AUTH_SECRET).not.toBe("");
    expect(text.match(/^AUTH_SECRET=/gm)).toHaveLength(1);
  });

  it("A-8: a second run changes nothing (never replaces a key)", () => {
    const first = fillSecrets("").text;
    const second = fillSecrets(first);
    expect(second.text).toBe(first);
    expect(second.generated).toEqual([]);
  });

  it("A-8: writeSecrets writes the file (0600) and keeps other lines", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "gen-secrets-"));
    const file = path.join(dir, ".env.production");
    writeFileSync(file, "SITE_URL=https://staging.visanjob.co.kr\nHASH_KEY=\n");
    const result = writeSecrets(file);
    const env = parse(readFileSync(file, "utf8"));
    expect(result.generated).toContain("HASH_KEY");
    expect(env.SITE_URL).toBe("https://staging.visanjob.co.kr");
    expect(env.HASH_KEY.length).toBeGreaterThan(0);
    if (process.platform !== "win32") expect(statSync(file).mode & 0o777).toBe(0o600);
  });

  it("A-8: the CLI (plain `node`, no packages) prints names only, never a value", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "gen-secrets-cli-"));
    const file = path.join(dir, ".env.production");
    const run = spawnSync(process.execPath, [path.resolve("scripts/gen-secrets.ts"), file], {
      encoding: "utf8",
    });
    expect(run.status).toBe(0);
    const env = parse(readFileSync(file, "utf8"));
    const printed = `${run.stdout}\n${run.stderr}`;
    expect(printed).toContain("generated: AUTH_SECRET");
    for (const name of Object.keys(SECRET_GENERATORS)) {
      expect(env[name].length).toBeGreaterThan(0);
      expect(printed).not.toContain(env[name]);
    }
  });
});
