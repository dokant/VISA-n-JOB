// Feature flags awaiting legal confirmation (WO §16, R-015).
// Default is OFF: a flag is on only when its env var is exactly "true" (case-insensitive, trimmed).
// Unset, empty, "false", "0", "yes" or anything else => false.
export const FEATURE_FLAGS = [
  "FEATURE_DEMAND_MAP",
  "FEATURE_PUBLIC_JOBS",
  "FEATURE_REFERRAL_REWARD",
  "FEATURE_EMPLOYER_CANDIDATES",
] as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[number];

type Env = Readonly<Record<string, string | undefined>>;

export function isFeatureEnabled(flag: FeatureFlag, env: Env = process.env): boolean {
  return env[flag]?.trim().toLowerCase() === "true";
}

export function getFeatureFlags(env: Env = process.env): Record<FeatureFlag, boolean> {
  return {
    FEATURE_DEMAND_MAP: isFeatureEnabled("FEATURE_DEMAND_MAP", env),
    FEATURE_PUBLIC_JOBS: isFeatureEnabled("FEATURE_PUBLIC_JOBS", env),
    FEATURE_REFERRAL_REWARD: isFeatureEnabled("FEATURE_REFERRAL_REWARD", env),
    FEATURE_EMPLOYER_CANDIDATES: isFeatureEnabled("FEATURE_EMPLOYER_CANDIDATES", env),
  };
}
