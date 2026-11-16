"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

// shadcn/ui checkbox restyled to STANDARD v2 3.1: 20px square, 4px radius (rounded-2xs), --input
// border; checked = navy fill + white Check (stroke 2). The label row around it is the 44px target.
function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-2xs border border-input bg-white",
        "transition-[background-color,border-color] duration-200 hover:border-n500",
        "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-brand-blue",
        "data-[state=checked]:border-navy data-[state=checked]:bg-navy data-[state=checked]:text-white",
        "aria-invalid:border-error disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator">
        <Check aria-hidden="true" strokeWidth={2} className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
