import { Noto_Sans_SC } from "next/font/google";

// STANDARD 2.3.1/2.3.3: Simplified Chinese, applied only on the zh locale. Kept out of
// src/lib/fonts.ts so its @font-face CSS is a separate chunk that only zh pages load
// (see components/common/zh-font.tsx). One variable weight instead of three static ones.
export const notoSansSC = Noto_Sans_SC({
  weight: "variable",
  display: "swap",
  preload: false,
  variable: "--font-noto-sans-sc",
});
