import { useId } from "react";

import { siteConfig } from "@/config/site.config";
import { cn } from "@/lib/utils";

type LogoProps = {
  /** "light" surfaces use navy, "dark" surfaces (hero, footer) use white. */
  tone?: "light" | "dark";
  /** Show the small secondary label next to the wordmark (hidden at <=760px). Rendered only when configured. */
  withTagline?: boolean;
  className?: string;
};

/**
 * Brand logo (STANDARD v2 3.1 / 3.2, DECISIONS Q-07).
 * Mark: handoff 30x30 arch + three legs + cyan dot, blue->cyan gradient stroke 2.2px, colors via CSS
 * variables only. Wordmark text comes from site.config (`brand.wordmark`, "VISA n JOB").
 * Wrap it in a link (e.g. SiteNav) to make it navigable; the wordmark is the accessible text.
 */
export function Logo({ tone = "light", withTagline = false, className }: LogoProps) {
  const gradientId = `vj-logo-grad-${useId().replace(/:/g, "")}`;
  const { wordmark, tagline } = siteConfig.brand;

  return (
    <span
      className={cn(
        "inline-flex flex-none items-center gap-2.5",
        tone === "light" ? "text-navy" : "text-white",
        className,
      )}
    >
      <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className="size-7.5 flex-none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: "var(--blue)" }} />
            <stop offset="1" style={{ stopColor: "var(--cyan)" }} />
          </linearGradient>
        </defs>
        <rect
          x="0.5"
          y="0.5"
          width="31"
          height="31"
          rx="9"
          className="fill-current"
          opacity="0.1"
        />
        <path
          d="M6 18.5c0-5.2 4.5-9.4 10-9.4s10 4.2 10 9.4"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M10 18.5v5.2M16 18.5v6.2M22 18.5v5.2"
          className="stroke-current"
          fill="none"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="16" cy="9" r="1.9" className="fill-brand-cyan" />
      </svg>
      <span className="text-body leading-none font-bold tracking-[0.06em] whitespace-nowrap">
        {wordmark}
        {withTagline && tagline ? (
          <span className="ml-1.5 hidden text-eyebrow font-medium tracking-[0.14em] opacity-55 md:inline">
            {tagline}
          </span>
        ) : null}
      </span>
    </span>
  );
}
