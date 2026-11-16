import type { Metadata } from "next";
import type { ReactNode } from "react";

import { inter, notoSansKR } from "@/lib/fonts";

// 관리자 영역: 한국어 전용(WO §12, R-118), 색인 금지(R-130). 접근 제어는 middleware(JWT 클레임) +
// 각 페이지의 requireStaff(DB 재확인)로 이중 확인한다.
export const metadata: Metadata = {
  title: { default: "관리자", template: "%s | 관리자" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={`${notoSansKR.variable} ${inter.variable}`}>
      <body className="min-h-dvh bg-n50 text-navy">{children}</body>
    </html>
  );
}
