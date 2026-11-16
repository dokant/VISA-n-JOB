"use client";

import * as React from "react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

// shadcn/ui radio-group as the handoff chip `.chip[aria-pressed]` (STANDARD v2 3.1): pill, 34px
// (44px below 1025px, B-10), 12.5px/500 n700 → here text-caption (13px, S-05 floor), --input border;
// selected = navy fill, white text, small navy shadow. Arrow keys move between chips (radix).
function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("flex flex-wrap gap-2", className)}
      {...props}
    />
  );
}

function RadioChip({
  className,
  children,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-chip"
      className={cn(chipClass, className)}
      {...props}
    >
      {children}
    </RadioGroupPrimitive.Item>
  );
}

/** Shared chip look (radio chips and multi-select toggle chips). */
const chipClass = cn(
  "inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-input bg-white px-4 text-caption font-medium text-n700 lg:h-8.5",
  "transition-[background-color,border-color,color,box-shadow] duration-200 hover:border-n500",
  "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-brand-blue",
  "data-[state=checked]:border-navy data-[state=checked]:bg-navy data-[state=checked]:text-white data-[state=checked]:shadow-ink",
  "aria-pressed:border-navy aria-pressed:bg-navy aria-pressed:text-white aria-pressed:shadow-ink",
  "disabled:cursor-not-allowed disabled:opacity-45",
);

export { RadioChip, RadioGroup, chipClass };
