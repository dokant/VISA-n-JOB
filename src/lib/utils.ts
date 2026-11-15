import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge must know the custom theme keys (STANDARD v2 2.2.2), otherwise e.g. `text-ui`
// (font size) and `text-navy` (color) would be treated as conflicting and one would be dropped.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        "display",
        "h1",
        "h2",
        "h3",
        "lead",
        "body",
        "control",
        "ui",
        "dense",
        "caption",
        "meta",
        "label",
        "eyebrow",
        "metric",
      ],
      shadow: ["1", "2", "3", "glow", "cta", "ink", "orange", "tab"],
      radius: ["2xs"],
      blur: ["glass"],
      ease: ["standard"],
      breakpoint: ["xs"],
      container: ["site"],
      spacing: ["section", "section-tight", "gutter"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
