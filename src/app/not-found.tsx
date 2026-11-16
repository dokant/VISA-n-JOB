import "./globals.css";

import { inter, notoSansKR } from "@/lib/fonts";

// Global 404 for non-localized paths (e.g. /admin/* before P1b). The admin area is Korean only (WO §12).
export default function GlobalNotFound() {
  return (
    <html lang="ko" className={`${notoSansKR.variable} ${inter.variable}`}>
      <body className="min-h-dvh">
        <main className="mx-auto max-w-xl px-gutter py-section-tight">
          <h1 className="text-h1 text-navy">페이지를 찾을 수 없습니다</h1>
        </main>
      </body>
    </html>
  );
}
