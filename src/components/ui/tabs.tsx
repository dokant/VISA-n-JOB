"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

// shadcn/ui tabs restyled to the handoff segmented `.aud__tabs` (STANDARD v2 3.1): n100 track with
// n200 border and 4px padding, pill; tabs 44px at every width (v2.10, Q-15) 13px/600; unselected n700
// (B-05); selected white, navy, shadow-tab.
// Narrow screens (QA P2e D-2): the list never grows past its container. When the labels do not fit
// on one line (en·vi·uz at 375px) each tab shrinks and its label wraps to two lines inside the same
// segment (min 44px high), so every tab stays fully visible and tappable without a hidden scroll.
// Labels wrap between words only (STANDARD v2.23 3.1 tabs, P2e R2-1): the trigger sets
// `overflow-wrap: normal` (`wrap-normal`) instead of the global `anywhere`, and keeps the default
// `min-width: auto`, so a tab never shrinks below its longest word ("Companie/s" was a min-w-0 tab
// whose min-content had become one letter wide).

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn(className)} {...props} />;
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex max-w-full items-center gap-0.5 rounded-full border border-n200 bg-n100 p-1",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-3 text-center text-caption leading-tight font-semibold text-balance wrap-normal text-n700 sm:px-4",
        "transition-[background-color,color,box-shadow] duration-300 ease-standard hover:text-navy",
        "data-[state=active]:bg-white data-[state=active]:text-navy data-[state=active]:shadow-tab",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn(className)} {...props} />;
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
