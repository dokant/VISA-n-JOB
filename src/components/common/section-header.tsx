import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Props = {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  /** Optional right-side action (row layout, bottom aligned). */
  action?: ReactNode;
  /** h1 for page headers (text-h1), h2 for sections (text-h2). */
  as?: "h1" | "h2";
  tone?: "light" | "dark";
  className?: string;
  titleClassName?: string;
  id?: string;
};

/**
 * STANDARD v2 3.2 SectionHeader [HO `.shead`, `.eyebrow`]: eyebrow (22px hairline before it) + title
 * + lead, 18px vertical rhythm, max 720px. Dark surfaces: eyebrow white/60, lead white/66.
 */
export function SectionHeader({
  eyebrow,
  title,
  lead,
  action,
  as = "h2",
  tone = "light",
  className,
  titleClassName,
  id,
}: Props) {
  const Heading = as;
  const block = (
    <div className="grid max-w-180 gap-4.5">
      {eyebrow ? (
        <span
          className={cn(
            "inline-flex items-center gap-2.5 text-eyebrow uppercase",
            tone === "dark" ? "text-white/60" : "text-n500",
          )}
        >
          <span aria-hidden="true" className="h-px w-5.5 bg-current opacity-55" />
          {eyebrow}
        </span>
      ) : null}
      <Heading
        id={id}
        className={cn(
          as === "h1" ? "text-h1" : "text-h2",
          tone === "dark" ? "text-white" : "text-navy",
          titleClassName,
        )}
      >
        {title}
      </Heading>
      {lead ? (
        <p className={cn("text-lead", tone === "dark" ? "text-white/66" : "text-n500")}>{lead}</p>
      ) : null}
    </div>
  );

  if (!action) return <div className={cn("reveal", className)}>{block}</div>;
  return (
    <div
      className={cn("reveal flex flex-wrap items-end justify-between gap-x-10 gap-y-6", className)}
    >
      {block}
      <div className="flex-none">{action}</div>
    </div>
  );
}
