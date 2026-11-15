import { Noto_Sans, Noto_Sans_SC } from "next/font/google";

// STANDARD 2.2. Fonts are downloaded at build time and self-hosted by next/font (no runtime <link>).
// Pretendard (next/font/local, src/fonts/) is pending: the woff2 file is not in the repo yet.
export const notoSans = Noto_Sans({
  subsets: ["latin", "latin-ext", "vietnamese", "cyrillic"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-noto-sans",
});

// Applied to <html> only for the zh locale.
export const notoSansSC = Noto_Sans_SC({
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
  variable: "--font-noto-sans-sc",
});
