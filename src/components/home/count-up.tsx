"use client";

import { useFormatter } from "next-intl";
import { useEffect, useRef, useState } from "react";

const DURATION_MS = 1400;
const EASE_POWER = 3.2;
const ENTER_RATIO = 0.94;

type Props = { value: number; decimals?: number };

/**
 * STANDARD v2 2.7 count-up [HO]: the server HTML holds the FINAL value; when the element enters the
 * viewport it animates 0 → value once over 1400ms with 1-(1-p)^3.2. Reduced motion → no animation.
 * Every frame is formatted with the next-intl number formatter (S-32).
 */
export function CountUp({ value, decimals = 0 }: Props) {
  const format = useFormatter();
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    let done = false;
    let raf = 0;
    let check = 0;

    const animate = () => {
      const start = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / DURATION_MS);
        setShown(value * (1 - Math.pow(1 - p, EASE_POWER)));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const onScroll = () => {
      if (check || done) return;
      check = requestAnimationFrame(() => {
        check = 0;
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * ENTER_RATIO && rect.bottom > 0) {
          done = true;
          window.removeEventListener("scroll", onScroll);
          animate();
        }
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      cancelAnimationFrame(check);
    };
  }, [value]);

  return (
    <span ref={ref}>
      {format.number(shown, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  );
}
