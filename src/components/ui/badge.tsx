import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// shadcn/ui badge restyled to the handoff `.badge` (STANDARD v2 3.1): 26px tall (sentence badges
// auto with 26px minimum), 11px side padding, pill, text-eyebrow 11.5px/600 0.02em.
const badgeVariants = cva(
  "inline-flex min-h-6.5 w-fit items-center gap-1.5 rounded-full border border-transparent px-2.75 text-eyebrow font-semibold tracking-[0.02em] [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        neutral: "bg-n100 text-n700",
        blue: "bg-tint-blue text-brand-blue-700",
        cyan: "bg-tint-cyan text-brand-cyan-ink",
        orange: "bg-tint-orange text-brand-orange-text",
        outline: "border-n200 bg-transparent text-n500",
        dark: "border-white/14 bg-white/10 text-white/86",
        solid: "bg-navy text-white",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
