/**
 * Password hashing for staff and employer accounts (R-118, R-123): argon2id via @node-rs/argon2
 * (PLAN 승인 도구). `User.password` only ever holds the hash.
 */
import { hash, verify } from "@node-rs/argon2";

export function hashPassword(plain: string): Promise<string> {
  return hash(plain);
}

/**
 * A real argon2 hash of a random value. Verifying against it when the account does not exist keeps
 * the response time the same as a wrong password (no account enumeration by timing).
 */
let dummyHash: Promise<string> | null = null;

export async function verifyPassword(storedHash: string | null, plain: string): Promise<boolean> {
  if (!storedHash) {
    dummyHash ??= hash(`dummy-${Math.random()}`);
    await verify(await dummyHash, plain).catch(() => false);
    return false;
  }
  try {
    return await verify(storedHash, plain);
  } catch {
    return false;
  }
}
