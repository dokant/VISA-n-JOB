import * as React from "react";

import { cn } from "@/lib/utils";

// shadcn/ui textarea restyled to STANDARD v2 3.1 "input, textarea": same border, radius, 14px side
// padding, 16px/500 navy text, hover and focus / error glow as `Input`; height grows with rows.
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-28 w-full min-w-0 rounded-sm border border-input bg-white px-3.5 py-3 text-control font-medium text-navy",
        "transition-[border-color,box-shadow] duration-200 placeholder:text-n500 hover:border-n500",
        "focus-visible:border-brand-blue focus-visible:ring-4 focus-visible:ring-brand-blue/13 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-45",
        "aria-invalid:border-error aria-invalid:ring-4 aria-invalid:ring-error/10",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
