import * as React from "react";

import { cn } from "@/lib/utils";

// shadcn/ui label, STANDARD v2 3.1: compact form label = text-label (12px/600) n700.
function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn("text-label text-n700 select-none", className)}
      {...props}
    />
  );
}

export { Label };
