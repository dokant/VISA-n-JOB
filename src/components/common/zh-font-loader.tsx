"use client";

import dynamic from "next/dynamic";

/**
 * zh pages only: loads the Noto Sans SC chunk (font CSS + class) after hydration, so the other five
 * locales never download its @font-face CSS (R-103). Until it loads, zh text uses the system CJK
 * fallback (display: swap behaviour).
 */
const ZhFont = dynamic(() => import("./zh-font"), { ssr: false });

export function ZhFontLoader() {
  return <ZhFont />;
}
