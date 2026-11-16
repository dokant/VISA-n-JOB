import type { Metadata } from "next";
import Link from "next/link";

import { STAFF_TASK_LABEL } from "@/app/admin/_i18n/ko";
import { ADMIN_STAY_EXPIRY_SOON_DAYS } from "@/config/limits";
import { dashboardCounts, openTaskCounts } from "@/lib/admin/dashboard";
import { requireStaff } from "@/lib/admin/session";
import { can } from "@/lib/rbac";

export const metadata: Metadata = { title: "대시보드" };
export const dynamic = "force-dynamic";

/** /admin — 오늘 처리할 일 (R-119). 카운트 정의는 src/lib/admin/dashboard.ts. */
export default async function AdminDashboardPage() {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  const now = new Date();
  const [counts, tasks] = await Promise.all([dashboardCounts(now), openTaskCounts(actor.role)]);
  const leadsOk = can(actor.role, "lead:manage");

  const cards = [
    {
      key: "newSeekers",
      label: "신규 구직자",
      hint: "상담 전 B등급",
      value: counts.newSeekers,
      href: "/admin/seekers?queue=NEW",
    },
    {
      key: "callLeads",
      label: "전화 대상 리드",
      hint: "리드 등급 C·B, 오늘까지 연락 예정",
      value: counts.callLeads,
      href: leadsOk ? "/admin/leads" : null,
    },
    {
      key: "interviewsToday",
      label: "면접 일정",
      hint: "오늘 잡힌 면접",
      value: counts.interviewsToday,
      href: null,
    },
    {
      key: "expiringSoon",
      label: "만료 임박",
      hint: `체류 만료 D-${ADMIN_STAY_EXPIRY_SOON_DAYS} 이내`,
      value: counts.expiringSoon,
      href: null,
    },
  ] as const;

  return (
    <div className="grid gap-8" data-testid="admin-dashboard">
      <h1 className="text-h2 text-navy">오늘 처리할 일</h1>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const body = (
            <>
              <p className="text-dense font-semibold text-n700">{c.label}</p>
              <p className="text-metric text-navy tabular-nums" data-testid={`count-${c.key}`}>
                {c.value}
              </p>
              <p className="text-caption text-n500">{c.hint}</p>
            </>
          );
          return (
            <li key={c.key}>
              {c.href ? (
                <Link
                  href={c.href}
                  className="grid h-full gap-1 rounded-md border border-border bg-white p-6 shadow-1 transition-[border-color,box-shadow] hover:border-brand-blue/30 hover:shadow-2"
                >
                  {body}
                </Link>
              ) : (
                <div className="grid h-full gap-1 rounded-md border border-border bg-white p-6 shadow-1">
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <section className="grid gap-3" aria-labelledby="tasks-title">
        <h2 id="tasks-title" className="text-h3 text-navy">
          열린 직원 업무
        </h2>
        {tasks.length === 0 ? (
          <p className="text-dense text-n500">열린 업무가 없습니다.</p>
        ) : (
          <ul className="flex flex-wrap gap-2" data-testid="open-tasks">
            {tasks.map((t) => (
              <li
                key={t.type}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-n200 bg-white px-4 text-dense text-navy"
              >
                {t.type === "LEAD_REVIEW" && leadsOk ? (
                  <Link
                    href="/admin/leads#lead-review"
                    className="inline-flex min-h-11 min-w-11 items-center underline-offset-4 hover:underline"
                  >
                    {STAFF_TASK_LABEL[t.type]}
                  </Link>
                ) : (
                  STAFF_TASK_LABEL[t.type]
                )}
                <span className="font-semibold tabular-nums" data-testid={`task-${t.type}`}>
                  {t.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
