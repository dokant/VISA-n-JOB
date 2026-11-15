/**
 * R-008: AES-256-GCM with key versions + HMAC-SHA256.
 * Keys come from tests/setup/env.ts (generated per test file).
 */
import { randomBytes } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import {
  CryptoConfigError,
  DecryptionError,
  decrypt,
  encrypt,
  hmacHash,
  isEncrypted,
  keyVersionOf,
  parseKeyring,
} from "@/lib/crypto";

const ORIGINAL_KEYS = process.env.ENCRYPTION_KEYS;
const ORIGINAL_HASH = process.env.HASH_KEY;

afterEach(() => {
  process.env.ENCRYPTION_KEYS = ORIGINAL_KEYS;
  process.env.HASH_KEY = ORIGINAL_HASH;
});

const key = () => randomBytes(32).toString("base64");

/** Flips one byte inside the base64url body of a payload. */
function tamper(payload: string, byteIndex: number): string {
  const [prefix, body] = payload.split(":");
  const raw = Buffer.from(body, "base64url");
  raw[byteIndex] ^= 0x01;
  return `${prefix}:${raw.toString("base64url")}`;
}

describe("R-008 crypto", () => {
  it("R-008: round trip (Korean, emoji, empty string) with the current key version", () => {
    for (const plain of ["홍길동", "+821012345678", "Nguyễn Văn A 🙂", ""]) {
      const payload = encrypt(plain);
      expect(payload.startsWith("v2:")).toBe(true);
      expect(payload).not.toContain(plain || "\u0000");
      expect(isEncrypted(payload)).toBe(true);
      expect(decrypt(payload)).toBe(plain);
    }
  });

  it("R-008: same plaintext encrypts differently every time (random IV)", () => {
    expect(encrypt("홍길동")).not.toBe(encrypt("홍길동"));
  });

  it("R-008: tampering with IV, tag or ciphertext fails authentication", () => {
    const payload = encrypt("secret value");
    for (const index of [0, 12, 28]) {
      expect(() => decrypt(tamper(payload, index))).toThrow(DecryptionError);
    }
    // relabelled version: v1 key cannot authenticate a v2 payload
    expect(() => decrypt(payload.replace(/^v2:/, "v1:"))).toThrow(/authentication failed/);
  });

  it("R-008: a wrong key fails, and the error never echoes the payload", () => {
    const payload = encrypt("홍길동");
    process.env.ENCRYPTION_KEYS = `2:${key()}`;
    try {
      decrypt(payload);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(DecryptionError);
      expect((e as Error).message).not.toContain(payload);
      expect((e as DecryptionError).code).toBe("DECRYPTION_FAILED");
    }
  });

  it("R-008: after key rotation old-version payloads still decrypt, new ones use the new version", () => {
    const v1 = process.env.TEST_ENCRYPTION_KEY_V1 as string;
    process.env.ENCRYPTION_KEYS = `1:${v1}`;
    const old = encrypt("구버전 값");
    expect(keyVersionOf(old)).toBe(1);

    const v3 = key();
    process.env.ENCRYPTION_KEYS = `1:${v1}, 3:${v3}`; // rotate: add v3, keep v1
    expect(decrypt(old)).toBe("구버전 값");
    const fresh = encrypt("신버전 값");
    expect(keyVersionOf(fresh)).toBe(3);
    expect(decrypt(fresh)).toBe("신버전 값");

    process.env.ENCRYPTION_KEYS = `3:${v3}`; // v1 retired → old payload no longer readable
    expect(() => decrypt(old)).toThrow(/no key for version v1/);
  });

  it("rejects values that are not payloads", () => {
    expect(isEncrypted("plain text")).toBe(false);
    expect(keyVersionOf("plain text")).toBeNull();
    expect(() => decrypt("plain text")).toThrow(/not an encrypted payload/);
    expect(() => decrypt("v2:AAAA")).toThrow(/too short/);
  });

  it("validates ENCRYPTION_KEYS", () => {
    expect(() => parseKeyring(undefined)).toThrow(CryptoConfigError);
    expect(() => parseKeyring("  ")).toThrow(/not set/);
    expect(() => parseKeyring(" , ")).toThrow(/no keys/);
    expect(() => parseKeyring("abc")).toThrow(/<version>:<base64>/);
    expect(() => parseKeyring(`1:${randomBytes(16).toString("base64")}`)).toThrow(/32 bytes/);
    const k = key();
    expect(() => parseKeyring(`1:${k},1:${k}`)).toThrow(/duplicated/);
    expect(parseKeyring(`1:${k},5:${key()},2:${key()}`).current).toBe(5);

    delete process.env.ENCRYPTION_KEYS;
    expect(() => encrypt("x")).toThrow(/ENCRYPTION_KEYS is not set/);
  });

  it("R-008: hmacHash is deterministic HMAC-SHA256 hex and key dependent", () => {
    const a = hmacHash("+821012345678");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(hmacHash("+821012345678")).toBe(a);
    expect(hmacHash("+821012345679")).not.toBe(a);
    process.env.HASH_KEY = key();
    expect(hmacHash("+821012345678")).not.toBe(a);
  });

  it("hmacHash requires a HASH_KEY of at least 32 bytes", () => {
    delete process.env.HASH_KEY;
    expect(() => hmacHash("x")).toThrow(/HASH_KEY is not set/);
    process.env.HASH_KEY = randomBytes(16).toString("base64");
    expect(() => hmacHash("x")).toThrow(/at least 32 bytes/);
  });
});
