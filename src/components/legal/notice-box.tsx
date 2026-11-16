import { Info } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  tone?: "light" | "dark";
  className?: string;
};

/**
 * STANDARD v2 3.2 NoticeBox [HO Design System `.note`]: role="note", cannot be collapsed or closed,
 * placed ABOVE the data it qualifies. n50 surface, n200 border, 10px radius, 12px/14px padding,
 * Info 16px blue-600, text-dense n700. Dark variant: white/5 surface, white/16 border, white/72 text.
 */
export function NoticeBox({ children, tone = "light", className }: Props) {
  return (
    <div
      role="note"
      data-testid="notice-box"
      className={cn(
        "flex items-start gap-2.5 rounded-sm border px-3.5 py-3 text-dense",
        tone === "dark"
          ? "border-white/16 bg-white/5 text-white/72"
          : "border-n200 bg-n50 text-n700",
        className,
      )}
    >
      <Info
        aria-hidden="true"
        strokeWidth={1.5}
        className={cn(
          "mt-0.75 size-4 flex-none",
          tone === "dark" ? "text-brand-cyan" : "text-brand-blue-600",
        )}
      />
      <p>{children}</p>
    </div>
  );
}
