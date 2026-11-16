import * as React from "react";

import { cn } from "@/lib/utils";

// shadcn/ui card restyled to the handoff `.card` (STANDARD v2 3.1): white, 1px border, 16px radius,
// shadow-1, 20~26px padding. Only clickable cards lift on hover (add the classes at the use site).
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-md border border-border bg-card p-6 text-card-foreground shadow-1",
        className,
      )}
      {...props}
    />
  );
}

export { Card };
