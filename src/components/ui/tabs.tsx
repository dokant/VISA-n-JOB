"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

// shadcn/ui tabs restyled to the handoff segmented `.aud__tabs` (STANDARD v2 3.1): n100 track with
// n200 border and 4px padding, pill; tabs 44px at every width (v2.10, Q-15) 13px/600; unselected n700
// (B-05); selected white, navy, shadow-tab.

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
        "inline-flex h-11 cursor-pointer items-center justify-center rounded-full px-4 text-caption font-semibold whitespace-nowrap text-n700",
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
