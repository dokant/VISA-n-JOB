/**
 * Vitest setupFiles — test-only secrets (PLAN 공통 규칙 5, N-06).
 * Keys are generated fresh for every test file and never read from .env, so no real key is used
 * or needed by the test suite. Version 2 is current; version 1 exists to exercise key rotation.
 */
import { randomBytes } from "node:crypto";

const v1 = randomBytes(32).toString("base64");
const v2 = randomBytes(32).toString("base64");

process.env.TEST_ENCRYPTION_KEY_V1 = v1;
process.env.ENCRYPTION_KEYS = `1:${v1},2:${v2}`;
process.env.HASH_KEY = randomBytes(32).toString("base64");

// R-214 / PLAN P2d 위험 "실제 SMTP로 잘못 발송": tests never see SMTP settings, so the SMTP adapter is
// never created from the environment (adapter tests pass their own config and a mock transport).
for (const key of [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
]) {
  delete process.env[key];
}
