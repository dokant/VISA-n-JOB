import "./globals.css";

// Global 404 for non-localized paths (e.g. /admin/* before P1b). The admin area is Korean only (WO §12).
export default function GlobalNotFound() {
  return (
    <html lang="ko">
      <body className="min-h-dvh antialiased">
        <main className="mx-auto max-w-xl px-4 py-16 md:px-6">
          <h1 className="text-2xl leading-8 font-bold">페이지를 찾을 수 없습니다</h1>
        </main>
      </body>
    </html>
  );
}
