/**
 * 관리자 대시보드 "오늘 처리할 일" 카운트 (PRD R-119, WO §6.5, DECISIONS PC-10).
 *
 * Each count is one `count()` over the `where` built here, so the screen and the tests read the
 * same definition:
 * - 신규 구직자: 아직 상담하지 않은(consultedAt 없음) B등급 구직자, 차단(BLOCKED) 제외 — 검토 큐의 입구.
 * - 전화 대상 리드: 리드 등급 C·B 중 다음 연락 예정일이 없거나 오늘(한국 시간) 안에 도래한 리드.
 *   A(공고 가능)·보관·재접촉금지는 전화 대상이 아니다.
 * - 면접 일정: 오늘(한국 시간 00:00~24:00) 잡힌 면접.
 * - 만료 임박: 체류 만료가 아직 지나지 않았고 D-90(PC-10) 안에 드는 구직자, 차단 제외.
 *   체류 만료는 월 단위 값이라 "지나지 않음"은 `notExpiredFrom`(R-109와 같은 판정)으로 본다.
 * Also: open StaffTask counts for the actor's role (PC-4 queue, e.g. LEAD_REVIEW from P1d).
 */
import type { Prisma, Role, StaffTaskType } from "@prisma/client";

import { ADMIN_STAY_EXPIRY_SOON_DAYS } from "@/config/limits";
import { db } from "@/lib/db";
import { notExpiredFrom } from "@/lib/visa-engine/classifyTrack";

const DAY_MS = 86_400_000;
/** Korea has no daylight saving time: KST is always UTC+9. */
const KST_OFFSET_MS = 9 * 3_600_000;

/** [start, end) of the Korean calendar day that contains `now`. */
export function kstDayRange(now: Date): { start: Date; end: Date } {
  const start = Math.floor((now.getTime() + KST_OFFSET_MS) / DAY_MS) * DAY_MS - KST_OFFSET_MS;
  return { start: new Date(start), end: new Date(start + DAY_MS) };
}

export type DashboardScope = {
  seeker?: Prisma.SeekerProfileWhereInput;
  lead?: Prisma.JobLeadWhereInput;
  interview?: Prisma.InterviewWhereInput;
};

function scoped<T extends object>(where: T, scope: T | undefined): T {
  return (scope ? { AND: [where, scope] } : where) as T;
}

export function newSeekersWhere(): Prisma.SeekerProfileWhereInput {
  return { grade: "B", consultedAt: null, status: { not: "BLOCKED" } };
}

export function callLeadsWhere(now: Date): Prisma.JobLeadWhereInput {
  const { end } = kstDayRange(now);
  return {
    grade: { in: ["C", "B"] },
    OR: [{ nextActionAt: null }, { nextActionAt: { lt: end } }],
  };
}

export function interviewsTodayWhere(now: Date): Prisma.InterviewWhereInput {
  const { start, end } = kstDayRange(now);
  return { scheduledAt: { gte: start, lt: end } };
}

export function expiringSoonWhere(now: Date): Prisma.SeekerProfileWhereInput {
  return {
    status: { not: "BLOCKED" },
    stayExpiry: {
      gte: notExpiredFrom(now),
      lte: new Date(now.getTime() + ADMIN_STAY_EXPIRY_SOON_DAYS * DAY_MS),
    },
  };
}

export type DashboardCounts = {
  newSeekers: number;
  callLeads: number;
  interviewsToday: number;
  expiringSoon: number;
};

export async function dashboardCounts(
  now: Date = new Date(),
  opts: { scope?: DashboardScope; client?: typeof db } = {},
): Promise<DashboardCounts> {
  const client = opts.client ?? db;
  const scope = opts.scope ?? {};
  const [newSeekers, callLeads, interviewsToday, expiringSoon] = await Promise.all([
    client.seekerProfile.count({ where: scoped(newSeekersWhere(), scope.seeker) }),
    client.jobLead.count({ where: scoped(callLeadsWhere(now), scope.lead) }),
    client.interview.count({ where: scoped(interviewsTodayWhere(now), scope.interview) }),
    client.seekerProfile.count({ where: scoped(expiringSoonWhere(now), scope.seeker) }),
  ]);
  return { newSeekers, callLeads, interviewsToday, expiringSoon };
}

/** Open (OPEN / IN_PROGRESS) staff tasks the role works on: its own role, unassigned, or all for ADMIN. */
export function openTasksWhere(role: Role): Prisma.StaffTaskWhereInput {
  const open: Prisma.StaffTaskWhereInput = { status: { in: ["OPEN", "IN_PROGRESS"] } };
  if (role === "ADMIN") return open;
  return { AND: [open, { OR: [{ assigneeRole: role }, { assigneeRole: null }] }] };
}

export async function openTaskCounts(
  role: Role,
  opts: { scope?: Prisma.StaffTaskWhereInput; client?: typeof db } = {},
): Promise<{ type: StaffTaskType; count: number }[]> {
  const client = opts.client ?? db;
  const rows = await client.staffTask.groupBy({
    by: ["type"],
    where: scoped(openTasksWhere(role), opts.scope),
    _count: { _all: true },
    orderBy: { type: "asc" },
  });
  return rows.map((r) => ({ type: r.type, count: r._count._all }));
}
