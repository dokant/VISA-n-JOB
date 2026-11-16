// Shared by the server wrapper and the client audience selector (no "use client" here, so the
// server can read the values).
export const AUDIENCES = ["employer", "seeker", "agency"] as const;
export type Audience = (typeof AUDIENCES)[number];

export type AudienceCopy = {
  tab: string;
  num: string;
  kicker: string;
  title: string;
  subtitle: string;
  desc: string;
  action: string;
  panel: {
    title: string;
    body: string;
    bullets: string[];
    badge?: string;
    cta: { href: string; label: string; variant: "default" | "seeker" };
    secondary?: { href: string; label: string };
  };
};
