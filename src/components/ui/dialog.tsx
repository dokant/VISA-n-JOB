"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

// shadcn/ui dialog restyled to the handoff `.modal` (STANDARD v2 3.1): scrim navy 86% + blur-glass (14px), 0.35s
// fade; shell rounded-lg (22px), white, shadow-3, enters from translateY(18px) scale(.98) in 0.5s.
// Close button rotates 90° on hover. Used for confirmations (동의 철회).
// The close button is 48px (size-12): the shell enters at scale(.98), so a 44px button measures
// 43px during the entrance; 48px stays above the 44px touch target throughout (P2c QA O-3).

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

function DialogContent({
  className,
  children,
  closeLabel,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { closeLabel: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-slot="dialog-overlay"
        className="fixed inset-0 z-50 bg-navy-deep/86 backdrop-blur-glass data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-350"
      />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed inset-x-4 top-1/2 z-50 mx-auto grid max-w-110 -translate-y-1/2 gap-5 rounded-lg bg-white p-6.5 shadow-3",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-dialog data-[state=open]:zoom-in-98 data-[state=open]:duration-500 data-[state=open]:ease-out",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute end-3 top-3 inline-flex size-12 cursor-pointer items-center justify-center rounded-full text-n700 transition-transform duration-300 hover:rotate-90 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-brand-blue"
          aria-label={closeLabel}
        >
          <X aria-hidden="true" strokeWidth={1.5} className="size-5" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("pe-10 text-h3 text-navy", className)} {...props} />;
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description className={cn("text-dense text-n700", className)} {...props} />
  );
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger };
