"use client";

import { useEffect } from "react";

import { usePathname } from "@/i18n/navigation";

const ENTER_RATIO = 0.94;
const ENTER_BOTTOM = -40;
const MAGNET_X = 7;
const MAGNET_Y = 5;

/**
 * STANDARD v2 2.7 motion contracts [HO], mounted once by the public layout.
 * - Reveal: adds `js-reveal` to <html>, then marks `.reveal` elements `is-in` when
 *   `rect.top < innerHeight * 0.94 && rect.bottom > -40` (getBoundingClientRect + rAF, no
 *   IntersectionObserver). Content stays opaque: only a transform offset animates (brand.css).
 * - Magnetic CTAs: `[data-magnetic]` follow the pointer (transform only), off for touch and
 *   reduced motion.
 * With reduced motion everything is marked `is-in` immediately. Renders nothing.
 */
export function RevealController() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pending = () => Array.from(document.querySelectorAll<HTMLElement>(".reveal:not(.is-in)"));

    if (reduced) {
      for (const el of pending()) el.classList.add("is-in");
      return;
    }

    let frame = 0;
    const check = () => {
      frame = 0;
      const limit = window.innerHeight * ENTER_RATIO;
      for (const el of pending()) {
        const rect = el.getBoundingClientRect();
        if (rect.top < limit && rect.bottom > ENTER_BOTTOM) el.classList.add("is-in");
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };

    // Elements already in view are marked before the offset class applies (no jump on load).
    check();
    root.classList.add("js-reveal");
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname]);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;

    const onMove = (event: PointerEvent) => {
      const target = (event.target as Element | null)?.closest<HTMLElement>("[data-magnetic]");
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const dx = (event.clientX - (rect.left + rect.width / 2)) / rect.width;
      const dy = (event.clientY - (rect.top + rect.height / 2)) / rect.height;
      target.style.transform = `translate(${dx * MAGNET_X}px, ${dy * MAGNET_Y - 1}px)`;
    };
    const onLeave = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches?.("[data-magnetic]")) target.style.transform = "";
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onLeave, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onLeave);
    };
  }, []);

  return null;
}
