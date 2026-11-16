import { ROLE_LABEL } from "@/app/admin/_i18n/ko";
import { getSiteConfig } from "@/config/site.config";
import type { StaffActor } from "@/lib/admin/session";

import { AdminNav } from "./admin-nav";
import { SignOutButton } from "./sign-out-button";

/** 관리자 공통 머리글 (P1b 머리글 + P1e 메뉴). */
export function AdminHeader({ actor }: { actor: StaffActor }) {
  return (
    <header className="border-b border-n200 bg-white">
      <div className="mx-auto flex max-w-site flex-wrap items-center justify-between gap-3 px-gutter py-3">
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-ui font-semibold text-navy">{getSiteConfig().brand.wordmark} 관리자</p>
          <AdminNav />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-dense text-n700" data-testid="admin-actor">
            {actor.displayName ?? "직원"} · {ROLE_LABEL[actor.role]}
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
