import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

// shadcn/ui button restyled to the handoff `.btn` (STANDARD v2 3.1).
// All buttons are pills. Sizes: sm 44px / default 52px / lg 60px; every size is at least 44px at every
// width (STANDARD v2.10 3.3, CLAUDE.md h-11, Q-15), and at least 44px wide (min-w-11, Q-16). Icons: 10px gap; a trailing icon marked data-icon="trailing" nudges 3px on hover.
// Press = scale(.975). Disabled = opacity .45. Focus = global :focus-visible outline (2.8).
const buttonVariants = cva(
  [
    "relative inline-flex min-w-11 shrink-0 cursor-pointer items-center justify-center gap-2.5 rounded-full border border-transparent whitespace-nowrap",
    "transition-[transform,box-shadow,background-color,color,border-color] duration-300 ease-standard",
    "active:scale-[0.975] disabled:pointer-events-none disabled:opacity-45",
    "aria-invalid:border-destructive",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5",
    "[&_[data-icon=trailing]]:transition-transform [&_[data-icon=trailing]]:duration-400 [&_[data-icon=trailing]]:ease-out hover:[&_[data-icon=trailing]]:translate-x-0.75",
  ].join(" "),
  {
    variants: {
      variant: {
        // Employer / primary action (`.btn--ink`)
        default: "bg-primary text-primary-foreground shadow-ink hover:bg-navy-soft",
        // Brand CTA with white text: darkened gradient (B-02), never the raw --grad
        brand: "bg-(image:--grad-cta) text-white shadow-cta hover:shadow-glow",
        // Seeker CTA only (`.btn--orange`); text is always orange-ink (B-11)
        seeker: "bg-brand-orange text-brand-orange-ink shadow-orange hover:bg-brand-orange-hover",
        outline: "border-navy/16 bg-white text-navy hover:border-navy/32",
        // Dark surfaces only
        glass:
          "border-white/26 bg-white/9 text-white backdrop-blur-glass hover:border-white/40 hover:bg-white/16",
        // Blue hover text uses blue-600 (B-03)
        ghost: "text-navy hover:text-brand-blue-600",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        sm: "h-11 px-4 text-dense font-semibold",
        default: "h-13 px-6 text-ui",
        lg: "h-15 px-7.5 text-control font-semibold",
      },
    },
    // Ghost keeps the handoff's 6px inline padding regardless of size (compound runs after size).
    compoundVariants: [{ variant: "ghost", className: "px-1.5" }],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
