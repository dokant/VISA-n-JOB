"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV } from "@/app/admin/_i18n/ko";
import { cn } from "@/lib/utils";

/** 관리자 주 메뉴. 현재 화면은 aria-current="page". */
export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="관리자 메뉴" className="flex flex-wrap gap-1">
      {NAV.map((item) => {
        const current =
          item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "inline-flex h-11 items-center rounded-full px-4 text-dense font-semibold text-n700 transition-colors hover:text-navy",
              current && "bg-n100 text-navy",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
