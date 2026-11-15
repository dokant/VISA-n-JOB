import localFont from "next/font/local";
import { Inter, Noto_Sans_SC } from "next/font/google";

// STANDARD v2 2.3.3. All fonts are self-hosted by next/font (no CDN <link>/@import).
// next/font/google downloads at build time (build needs internet).

// Pretendard 1.3.9 official KS X 1001 subset (2,780 Hangul syllables incl. all 2,350 of KS X 1001,
// Latin, punctuation). Files copied from npm `pretendard@1.3.9` dist/web/static/woff2-subset.
// License: SIL OFL 1.1 (src/fonts/OFL.txt).
// The official package ships the subset as static weights only (no variable subset), so the four
// weights used by the type scale (400/500/600/700) are declared here.
// preload: false — next/font cannot preload per locale, and preloading ~1MB on every locale would
// hurt non-Korean pages. Korean text swaps in (display: swap).
export const pretendard = localFont({
  src: [
    { path: "../fonts/Pretendard-Regular.subset.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Pretendard-Medium.subset.woff2", weight: "500", style: "normal" },
    { path: "../fonts/Pretendard-SemiBold.subset.woff2", weight: "600", style: "normal" },
    { path: "../fonts/Pretendard-Bold.subset.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  preload: false,
  variable: "--font-pretendard",
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
  variable: "--font-inter",
});

// Simplified Chinese. Applied to <html> only for the zh locale.
export const notoSansSC = Noto_Sans_SC({
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
  variable: "--font-noto-sans-sc",
});
