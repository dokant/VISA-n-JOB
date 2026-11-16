import * as React from "react";

import { cn } from "@/lib/utils";

// shadcn/ui input restyled to STANDARD v2 3.1: 48px, 10px radius, 14px side padding, 16px/500 navy
// (B-08), --input border (B-09), hover n500, focus = blue border + 4px glow (2.8), error = --error
// border + glow when aria-invalid.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-sm border border-input bg-white px-3.5 text-control font-medium text-navy",
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

export { Input };
