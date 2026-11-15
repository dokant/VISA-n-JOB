/**
 * Field encryption and lookup hashing (WO §11, PRD R-008, STANDARD 4.7).
 *
 * - `encrypt` / `decrypt`: AES-256-GCM with a key version prefix.
 *   Payload format: `v{n}:{base64url(iv[12] ‖ tag[16] ‖ ciphertext)}`.
 *   New values are always written with the highest key version; older versions stay decryptable
 *   as long as their key remains in `ENCRYPTION_KEYS` (key rotation).
 * - `hmacHash`: HMAC-SHA256 (hex) with `HASH_KEY`, for `…Hash` lookup columns.
 *
 * Keys come only from environment variables (N-06):
 *   ENCRYPTION_KEYS="1:<base64 32 bytes>,2:<base64 32 bytes>"
 *   HASH_KEY="<base64, at least 32 bytes>"
 * Generate a key: `openssl rand -base64 32` (or Node `crypto.randomBytes(32).toString("base64")`).
 *
 * STANDARD 4.7: app code never calls encrypt/decrypt directly — only the `db.ts` extension and
 * hash generation use this module.
 */
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const MIN_HASH_KEY_LENGTH = 32;
const PAYLOAD_RE = /^v([1-9][0-9]*):([A-Za-z0-9_-]+)$/;

export class CryptoConfigError extends Error {
  readonly code = "CRYPTO_CONFIG";
  constructor(message: string) {
    super(message);
    this.name = "CryptoConfigError";
  }
}

export class DecryptionError extends Error {
  readonly code = "DECRYPTION_FAILED";
  constructor(message: string) {
    super(message);
    this.name = "DecryptionError";
  }
}

type Keyring = { current: number; keys: Map<number, Buffer> };

let cachedKeyring: { source: string; ring: Keyring } | null = null;

/** Parses `ENCRYPTION_KEYS` ("1:base64,2:base64"). Exported for tests and config checks. */
export function parseKeyring(source: string | undefined): Keyring {
  if (!source || source.trim() === "") {
    throw new CryptoConfigError("ENCRYPTION_KEYS is not set");
  }
  const keys = new Map<number, Buffer>();
  for (const part of source.split(",")) {
    const entry = part.trim();
    if (entry === "") continue;
    const m = /^([1-9][0-9]*):(.+)$/.exec(entry);
    if (!m) throw new CryptoConfigError("ENCRYPTION_KEYS entry must look like <version>:<base64>");
    const version = Number(m[1]);
    const key = Buffer.from(m[2], "base64");
    if (key.length !== KEY_LENGTH) {
      throw new CryptoConfigError(`ENCRYPTION_KEYS v${version} must decode to ${KEY_LENGTH} bytes`);
    }
    if (keys.has(version)) throw new CryptoConfigError(`ENCRYPTION_KEYS v${version} is duplicated`);
    keys.set(version, key);
  }
  if (keys.size === 0) throw new CryptoConfigError("ENCRYPTION_KEYS has no keys");
  return { current: Math.max(...keys.keys()), keys };
}

function keyring(): Keyring {
  const source = process.env.ENCRYPTION_KEYS ?? "";
  if (cachedKeyring?.source !== source) {
    cachedKeyring = { source, ring: parseKeyring(source) };
  }
  return cachedKeyring.ring;
}

/** True when the value has the `v{n}:` payload shape (not a proof that it decrypts). */
export function isEncrypted(value: string): boolean {
  return PAYLOAD_RE.test(value);
}

/** Key version a payload was written with, or null when the value is not a payload. */
export function keyVersionOf(value: string): number | null {
  const m = PAYLOAD_RE.exec(value);
  return m ? Number(m[1]) : null;
}

export function encrypt(plaintext: string): string {
  const { current, keys } = keyring();
  const key = keys.get(current) as Buffer;
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v${current}:${Buffer.concat([iv, tag, body]).toString("base64url")}`;
}

export function decrypt(payload: string): string {
  const m = PAYLOAD_RE.exec(payload);
  if (!m) throw new DecryptionError("value is not an encrypted payload");
  const version = Number(m[1]);
  const key = keyring().keys.get(version);
  if (!key) throw new DecryptionError(`no key for version v${version}`);
  const raw = Buffer.from(m[2], "base64url");
  if (raw.length < IV_LENGTH + TAG_LENGTH) throw new DecryptionError("payload is too short");
  const iv = raw.subarray(0, IV_LENGTH);
  const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const body = raw.subarray(IV_LENGTH + TAG_LENGTH);
  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
  } catch {
    // Wrong key or tampered payload: GCM authentication failed. Never echo the payload.
    throw new DecryptionError("authentication failed (tampered value or wrong key)");
  }
}

/** HMAC-SHA256 (hex) for `…Hash` lookup columns. Callers normalise the input first (e.g. E.164). */
export function hmacHash(value: string): string {
  const source = process.env.HASH_KEY ?? "";
  if (source.trim() === "") throw new CryptoConfigError("HASH_KEY is not set");
  const key = Buffer.from(source, "base64");
  if (key.length < MIN_HASH_KEY_LENGTH) {
    throw new CryptoConfigError(`HASH_KEY must decode to at least ${MIN_HASH_KEY_LENGTH} bytes`);
  }
  return createHmac("sha256", key).update(value, "utf8").digest("hex");
}
