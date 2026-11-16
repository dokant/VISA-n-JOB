import type { Metadata } from "next";

import { SignOutButton } from "@/components/admin/sign-out-button";
import { getSiteConfig } from "@/config/site.config";
import { requireStaff } from "@/lib/admin/session";

export const metadata: Metadata = { title: "대시보드" };

const ROLE_LABEL = {
  STAFF_PLACEMENT: "매칭 담당",
  STAFF_VISA: "비자 담당",
  ADMIN: "관리자",
} as const;

/**
 * /admin — 직원 역할 + 2단계 인증 완료(R-118). 대시보드 내용(오늘 처리할 일 등)은 P1e(R-119)에서
 * 채운다. 지금은 빈 자리만 둔다.
 */
export default async function AdminHomePage() {
  const actor = await requireStaff();
  const roleLabel = ROLE_LABEL[actor.role as keyof typeof ROLE_LABEL] ?? actor.role;
  return (
    <div className="min-h-dvh">
      <header className="border-b border-n200 bg-white">
        <div className="mx-auto flex max-w-site items-center justify-between gap-4 px-gutter py-4">
          <p className="text-ui font-semibold text-navy">{getSiteConfig().brand.wordmark} 관리자</p>
          <div className="flex items-center gap-3">
            <span className="text-dense text-n700" data-testid="admin-actor">
              {actor.displayName ?? "직원"} · {roleLabel}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-site px-gutter py-10">
        <h1 className="text-h2 text-navy">대시보드</h1>
        <section
          className="mt-6 rounded-md border border-dashed border-n200 bg-white p-8 text-dense text-n700"
          data-testid="admin-dashboard-placeholder"
        >
          오늘 처리할 일(신규 구직자, 전화 대상 리드, 면접 일정, 만료 임박)은 다음 단계에서
          표시됩니다.
        </section>
      </main>
    </div>
  );
}
