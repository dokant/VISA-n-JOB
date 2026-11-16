import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

// Select with the 3.1 `select` trigger look (input shape: 48px, 10px radius, 14px side padding,
// 16px/500 navy text, --input border, hover n500, ChevronDown 14px right) on a native <select>.
// Native on purpose: public forms must work without JavaScript (STANDARD 3.3 "JS 비활성"), the
// option lists come from the database (17 시·도, 21 업종) and mobile browsers show their own picker.
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <span className="relative block">
      <select
        data-slot="native-select"
        className={cn(
          "h-12 w-full cursor-pointer appearance-none rounded-sm border border-input bg-white ps-3.5 pe-10 text-control font-medium text-navy",
          "transition-[border-color,box-shadow] duration-200 hover:border-n500",
          "focus-visible:border-brand-blue focus-visible:ring-4 focus-visible:ring-brand-blue/13 focus-visible:outline-none",
          "aria-invalid:border-error",
          className,
        )}
        {...props}
      />
      <ChevronDown
        aria-hidden="true"
        strokeWidth={1.5}
        className="pointer-events-none absolute end-3.5 top-1/2 size-3.5 -translate-y-1/2 text-n500"
      />
    </span>
  );
}

export { NativeSelect };
