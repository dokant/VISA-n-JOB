"use client";

import * as React from "react";
import { Progress as ProgressPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

// shadcn/ui progress as the handoff `.est__bar-track` (STANDARD v2 3.1): 5px n200 pill track,
// --grad fill, width transition 0.6s ease-out. Value 0..max.
function Progress({
  className,
  value,
  max = 100,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  const pct = Math.max(0, Math.min(100, ((value ?? 0) / max) * 100));
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      max={max}
      className={cn("relative h-1.25 w-full overflow-hidden rounded-full bg-n200", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="h-full rounded-full bg-(image:--grad) transition-[width] duration-600 ease-out"
        style={{ width: `${pct}%` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
