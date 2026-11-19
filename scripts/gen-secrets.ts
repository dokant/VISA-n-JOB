/**
 * Production secrets generator (A-8 deployment, deploy/DEPLOY.md).
 *
 *   node scripts/gen-secrets.ts deploy/.env.production      (Node 24 strips the types itself)
 *   pnpm exec tsx scripts/gen-secrets.ts deploy/.env.production
 *
 * Fills these variables of the given env file with fresh random values, in the same formats as the
 * development keys (.env.example, DECISIONS Q-08):
 *   AUTH_SECRET          base64 of 32 random bytes
 *   ENCRYPTION_KEYS      "1:" + base64 of 32 random bytes (version 1, src/lib/crypto.ts)
 *   HASH_KEY             base64 of 32 random bytes
 *   INGEST_API_KEY       base64url of 32 random bytes (>= INGEST_API_KEY_MIN_LENGTH characters)
 *   SEED_ADMIN_PASSWORD  base64url of 18 random bytes (24 characters, >= PASSWORD_MIN_LENGTH)
 *   POSTGRES_PASSWORD    hex of 24 random bytes (48 characters; URL-safe, no encoding needed)
 *
 * Then, when DATABASE_URL is empty or missing, it is assembled for the PostgreSQL container of
 * deploy/docker-compose.yml (DECISIONS Q-31): postgresql://visanjob:<POSTGRES_PASSWORD>@db:5432/visanjob
 * — nobody writes the URL by hand on staging. A set DATABASE_URL (e.g. a managed database) is kept.
 *
 * Rules:
 * - Values are written to the file only. Nothing secret is printed: the output lists names only.
 * - A variable that already has a value is kept (never replaced): replacing ENCRYPTION_KEYS or
 *   HASH_KEY would make the stored data unreadable. Rotation is a separate, manual procedure.
 *   POSTGRES_PASSWORD only takes effect when the database volume is first created, so it is never
 *   replaced either. When DATABASE_URL points at `db` with another password, a warning names both
 *   variables (no values).
 * - A missing file is created (mode 0600); other lines of an existing file are kept as they are.
 * - Uses only Node built-ins and erasable TypeScript, so it runs without installing packages.
 */
import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

type Generator = () => string;

const b64 = (bytes: number): string => randomBytes(bytes).toString("base64");
const b64url = (bytes: number): string => randomBytes(bytes).toString("base64url");

/** Variable → generator. Formats match .env.example (Q-08). */
export const SECRET_GENERATORS: Readonly<Record<string, Generator>> = {
  AUTH_SECRET: () => b64(32),
  ENCRYPTION_KEYS: () => `1:${b64(32)}`,
  HASH_KEY: () => b64(32),
  INGEST_API_KEY: () => b64url(32),
  SEED_ADMIN_PASSWORD: () => b64url(18),
  POSTGRES_PASSWORD: () => randomBytes(24).toString("hex"),
};

/** User and database name of the compose PostgreSQL container (deploy/docker-compose.yml `db`). */
export const LOCAL_DB = { user: "visanjob", database: "visanjob", host: "db", port: 5432 } as const;

export function localDatabaseUrl(password: string): string {
  const { user, database, host, port } = LOCAL_DB;
  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

export type FillResult = {
  text: string;
  generated: string[];
  kept: string[];
  /** Names-only notes, e.g. "DATABASE_URL password differs from POSTGRES_PASSWORD". */
  warnings: string[];
};

const LINE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/;

/** Current value of an assignment line (quotes removed, trailing comment ignored when unquoted). */
function valueOf(raw: string): string {
  const v = raw.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1).trim();
  }
  return v.replace(/(?:^|\s+)#.*$/, "").trim();
}

/**
 * Pure part: fills empty or missing secret variables in env-file text. Existing non-empty values
 * are kept. Missing variables are appended at the end.
 */
export function fillSecrets(
  text: string,
  generators: Readonly<Record<string, Generator>> = SECRET_GENERATORS,
): FillResult {
  const generated: string[] = [];
  const kept: string[] = [];
  const warnings: string[] = [];
  const values = new Map<string, string>();
  const seen = new Set<string>();
  let databaseUrlLine = -1;
  const lines = text.split(/\r?\n/).map((line, index) => {
    const m = LINE.exec(line);
    if (!m) return line;
    const name = m[1];
    if (name === "DATABASE_URL" && databaseUrlLine < 0) {
      databaseUrlLine = index;
      values.set(name, valueOf(m[2]));
    }
    const gen = generators[name];
    if (!gen || seen.has(name)) return line;
    seen.add(name);
    if (valueOf(m[2]) !== "") {
      kept.push(name);
      values.set(name, valueOf(m[2]));
      return line;
    }
    generated.push(name);
    const value = gen();
    values.set(name, value);
    return `${name}=${value}`;
  });
  const appended: string[] = [];
  for (const name of Object.keys(generators).filter((n) => !seen.has(n))) {
    const value = generators[name]();
    values.set(name, value);
    appended.push(`${name}=${value}`);
    generated.push(name);
  }

  // DATABASE_URL for the compose PostgreSQL container (Q-31), only when it is empty or missing.
  const pgPassword = values.get("POSTGRES_PASSWORD");
  const databaseUrl = values.get("DATABASE_URL") ?? "";
  if (pgPassword) {
    if (databaseUrl === "") {
      const line = `DATABASE_URL=${localDatabaseUrl(pgPassword)}`;
      if (databaseUrlLine >= 0) lines[databaseUrlLine] = line;
      else appended.push(line);
      generated.push("DATABASE_URL");
    } else {
      kept.push("DATABASE_URL");
      try {
        const url = new URL(databaseUrl);
        if (url.hostname === LOCAL_DB.host && decodeURIComponent(url.password) !== pgPassword) {
          warnings.push("DATABASE_URL password differs from POSTGRES_PASSWORD");
        }
      } catch {
        // Not a URL: left to the entrypoint checks.
      }
    }
  }

  if (appended.length > 0) {
    while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
    if (lines.length > 0) lines.push("");
    lines.push("# --- generated by scripts/gen-secrets.ts ---", ...appended);
  }
  return { text: `${lines.join("\n").replace(/\n+$/, "")}\n`, generated, kept, warnings };
}

/** Writes the secrets into `file` (0600, atomic rename). Returns the names only. */
export function writeSecrets(file: string): {
  generated: string[];
  kept: string[];
  warnings: string[];
} {
  const target = path.resolve(file);
  const before = existsSync(target) ? readFileSync(target, "utf8") : "";
  const { text, generated, kept, warnings } = fillSecrets(before);
  if (generated.length > 0) {
    const tmp = `${target}.tmp-${process.pid}`;
    writeFileSync(tmp, text, { encoding: "utf8", mode: 0o600 });
    renameSync(tmp, target);
  }
  try {
    chmodSync(target, 0o600);
  } catch {
    // Windows: no POSIX modes. The server (Linux) applies 0600.
  }
  return { generated, kept, warnings };
}

function main(): void {
  const file = process.argv[2];
  if (!file || file.startsWith("-")) {
    console.error("usage: node scripts/gen-secrets.ts <env file, e.g. deploy/.env.production>");
    process.exit(2);
  }
  const { generated, kept, warnings } = writeSecrets(file);
  // Names only — never the values.
  console.info(`generated: ${generated.length > 0 ? generated.join(", ") : "(none)"}`);
  console.info(`kept (already set): ${kept.length > 0 ? kept.join(", ") : "(none)"}`);
  for (const warning of warnings) console.warn(`warning: ${warning}`);
  console.info(`file: ${path.resolve(file)} (mode 0600)`);
}

if (process.argv[1] && /gen-secrets\.ts$/.test(process.argv[1])) main();
