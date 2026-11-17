import { describe, expect, it } from "vitest";

import { FEATURE_FLAGS, getFeatureFlags, isFeatureEnabled } from "@/config/flags";

describe("R-015 feature flags default to off", () => {
  it("lists exactly the four WO §16 flags", () => {
    expect([...FEATURE_FLAGS].sort()).toEqual(
      [
        "FEATURE_DEMAND_MAP",
        "FEATURE_EMPLOYER_CANDIDATES",
        "FEATURE_PUBLIC_JOBS",
        "FEATURE_REFERRAL_REWARD",
      ].sort(),
    );
  });

  it("R-015: every flag is false when env vars are unset", () => {
    const flags = getFeatureFlags({});
    expect(flags).toEqual({
      FEATURE_DEMAND_MAP: false,
      FEATURE_PUBLIC_JOBS: false,
      FEATURE_REFERRAL_REWARD: false,
      FEATURE_EMPLOYER_CANDIDATES: false,
    });
  });

  it.each(["false", "FALSE", "", " ", "0", "1", "yes", "on", "truthy"])(
    "R-015: value %j is treated as false",
    (value) => {
      for (const flag of FEATURE_FLAGS) {
        expect(isFeatureEnabled(flag, { [flag]: value })).toBe(false);
      }
    },
  );

  it.each(["true", "TRUE", " true ", "True"])("value %j turns a flag on", (value) => {
    expect(isFeatureEnabled("FEATURE_DEMAND_MAP", { FEATURE_DEMAND_MAP: value })).toBe(true);
  });

  it("turning one flag on does not affect the others", () => {
    const flags = getFeatureFlags({ FEATURE_PUBLIC_JOBS: "true" });
    expect(flags.FEATURE_PUBLIC_JOBS).toBe(true);
    expect(flags.FEATURE_DEMAND_MAP).toBe(false);
    expect(flags.FEATURE_REFERRAL_REWARD).toBe(false);
    expect(flags.FEATURE_EMPLOYER_CANDIDATES).toBe(false);
  });

  it("PRD §6 (P2e release check): the default E2E server sets no flag, only the flag-on servers do", async () => {
    const { readFileSync } = await import("node:fs");
    const config = readFileSync("playwright.config.ts", "utf8");
    const envs = [...config.matchAll(/env:\s*\{([^}]*)\}/g)].map((m) => m[1]);
    expect(envs.length).toBeGreaterThanOrEqual(2);
    // first webServer = the default production build: every flag stays at its default (false)
    for (const flag of FEATURE_FLAGS) expect(envs[0]).not.toContain(flag);
    // the other servers turn on exactly one flag each and FEATURE_REFERRAL_REWARD never
    for (const env of envs.slice(1)) {
      expect(FEATURE_FLAGS.filter((f) => env.includes(f))).toHaveLength(1);
    }
    expect(config).not.toContain("FEATURE_REFERRAL_REWARD");
  });

  it("R-015: .env.example keeps all four flags at false", async () => {
    const { readFileSync } = await import("node:fs");
    const example = readFileSync(".env.example", "utf8");
    for (const flag of FEATURE_FLAGS) {
      expect(example).toMatch(new RegExp(`^${flag}=false$`, "m"));
    }
  });
});
