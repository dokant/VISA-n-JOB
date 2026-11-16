import type { ReactNode } from "react";

import { AdminHeader } from "@/components/admin/admin-header";
import { requireStaff } from "@/lib/admin/session";

/**
 * 직원 화면 공통 틀: 직원 역할 + 2단계 인증 완료(R-118). 각 페이지와 서버 액션도 requireStaff()와
 * 권한 검사를 다시 한다(레이아웃만 믿지 않는다).
 */
export default async function StaffLayout({ children }: { children: ReactNode }) {
  const actor = await requireStaff();
  return (
    <div className="min-h-dvh">
      <AdminHeader actor={actor} />
      <main id="main" className="mx-auto max-w-site px-gutter py-8">
        {children}
      </main>
    </div>
  );
}
