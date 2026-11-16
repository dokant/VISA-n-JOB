import { Inter, Noto_Sans_KR } from "next/font/google";

// STANDARD v2 2.3.3. All fonts are self-hosted by next/font (no CDN <link>/@import).
// next/font/google downloads at build time (build needs internet).

// Korean: Noto Sans KR (DECISIONS SC-11, STANDARD 2.3.3). Pretendard (static KS X 1001 subset,
// 4 weights ≈ 1.07MB) kept /ko mobile Lighthouse performance at 58–81 (FCP/LCP 6–9s under simulated
// slow 4G), below R-103's 85. SC-11 pre-approves this swap. next/font/google self-hosts the variable
// font split into unicode-range slices, so a page downloads only the slices of the glyphs it uses.
// preload: false — Korean has no preloadable subset and non-Korean pages must not pay for it.
// The Pretendard files stay in src/fonts/ (unused) so the swap can be reverted.
export const notoSansKR = Noto_Sans_KR({
  weight: "variable",
  display: "swap",
  preload: false,
  variable: "--font-noto-sans-kr",
  fallback: [
    "system-ui",
    "-apple-system",
    "Apple SD Gothic Neo",
    "Malgun Gothic",
    "Segoe UI",
    "sans-serif",
  ],
});

// Latin, Latin Extended, Vietnamese, Cyrillic (en, vi, ru, uz; Latin glyphs for ko).
export const inter = Inter({
  subsets: ["latin", "latin-ext", "vietnamese", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  // Not preloaded: preloading 5 subsets on every page competed with the CSS for the first paint
  // (R-103); browsers fetch only the unicode-range slices a page actually uses.
  preload: false,
  variable: "--font-inter",
});

// Simplified Chinese (Noto Sans SC) is declared in src/lib/fontsZh.ts, NOT here: next/font puts the
// @font-face rules of every font imported by the root layout into the render-blocking CSS of every
// page, and Noto Sans SC's ~300 unicode-range faces were 95KB (gzip) on ko/en pages (R-103).
