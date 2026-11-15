import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
    // P0b: embedded Postgres test cluster on 127.0.0.1:54329, fresh database per run (migrate + seed).
    globalSetup: ["tests/setup/global-db.ts"],
    // P0c: test-only ENCRYPTION_KEYS / HASH_KEY generated per test file (never read from .env).
    setupFiles: ["tests/setup/env.ts"],
    hookTimeout: 120_000,
    testTimeout: 30_000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}", "scripts/**/*.ts"],
      exclude: ["src/components/ui/**", "src/app/**", "**/*.d.ts"],
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "coverage",
      // R-013: each security utility must keep >= 90% line coverage, or the run fails.
      thresholds: {
        "src/lib/crypto.ts": { lines: 90 },
        "src/lib/rbac.ts": { lines: 90 },
        "src/lib/audit.ts": { lines: 90 },
        "src/lib/pii-guard.ts": { lines: 90 },
      },
    },
  },
});
