/**
 * 리드 칸반·통화 기록 (PRD R-121, R-122; WO §6.5, §8.2, §8.3; BR-05, BR-15).
 *
 * 칸반 열: 리드 등급 C / B / A / 보관(ARCHIVED) / 재접촉금지(DO_NOT_CONTACT). 각 열의 기본 정렬은
 *   전화 우선순위(src/lib/leads/priority.ts) 내림차순. C·B·A 열은 모든 리드의 우선순위를 계산해 정렬한
 *   뒤 ADMIN_LEAD_COLUMN_MAX건을 보이고, 보관·재접촉금지 열은 최근 변경 ADMIN_LEAD_COLUMN_MAX건을
 *   같은 순서로 보인다(전화하지 않는 열이라 전량 계산하지 않는다).
 *
 * 통화 결과(CallLog.outcome) → 리드 등급:
 * - INTERESTED(관심 있음): C·보관 → B. B·A는 그대로.
 * - REQUEST_RECEIVED(구인신청 접수): C·보관 → B, `requestedAt`이 없으면 지금으로 기록.
 *   A는 따로 "검증 완료"(verifyLead)로만 간다 — 구인신청 + 직원 검증(BR-05, WO §8.2).
 * - DNC(재접촉 거부): 어느 등급에서든 DO_NOT_CONTACT(최종, R-115).
 * - NO_INTENT(고용 의사 없음): 어느 등급에서든 DO_NOT_CONTACT(WO §8.2 "의사 없음", DECISIONS Q-14),
 *   `foreignIntent=false`. NO_INTENT·DNC는 되돌릴 수 없어 화면이 확인 다이얼로그를 거치고 서버 액션은
 *   `confirmFinal=yes` 없이는 거부한다(FINAL_CALL_OUTCOMES).
 * - NO_ANSWER(부재): 등급 그대로. 연락이 닿지 않았으므로 `lastContactedAt`(R-116 30일 미접촉)은 바꾸지
 *   않는다. 그 밖의 결과는 `lastContactedAt=now`.
 * - 재접촉금지 리드에는 통화를 기록하지 않는다(전화 금지).
 * Every grade change goes through `transitionLead` (LEAD_GRADE_CHANGE in the same transaction).
 * CallLog.note is plain text: contact patterns are refused so no contact is stored unencrypted.
 * Contact values (`contact*Enc`) leave this module only through `revealLeadContact` (PII_VIEW).
 */
import type { LeadGrade, Prisma } from "@prisma/client";

import { ADMIN_LEAD_COLUMN_MAX } from "@/config/limits";
import { auditPiiView } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  type LeadPriority,
  type PrioritySeeker,
  leadPriority,
  loadPrioritySeekers,
  sortByPriority,
} from "@/lib/leads/priority";
import { type LeadTransitionReason, transitionLead } from "@/lib/leads/transitions";
import { hasContacts } from "@/lib/pii-guard";
import { CALL_OUTCOMES, type CallOutcome } from "@/schemas/admin/leads";

export { CALL_OUTCOMES, type CallOutcome };

type Client = typeof db;

export const LEAD_COLUMNS = [
  "C",
  "B",
  "A",
  "ARCHIVED",
  "DO_NOT_CONTACT",
] as const satisfies readonly LeadGrade[];
const WORKED: readonly LeadGrade[] = ["C", "B", "A"];

/** Grade after a call result (null = unchanged). */
export function gradeAfterCall(from: LeadGrade, outcome: CallOutcome): LeadGrade | null {
  if (from === "DO_NOT_CONTACT") return null;
  if (outcome === "DNC" || outcome === "NO_INTENT") return "DO_NOT_CONTACT";
  if (outcome === "INTERESTED" || outcome === "REQUEST_RECEIVED") {
    return from === "C" || from === "ARCHIVED" ? "B" : null;
  }
  return null;
}

const CALL_REASON: Partial<Record<CallOutcome, LeadTransitionReason>> = {
  INTERESTED: "CALL_INTERESTED",
  REQUEST_RECEIVED: "CALL_REQUEST_RECEIVED",
  DNC: "CALL_DNC",
  NO_INTENT: "CALL_NO_INTENT",
};

// ─── Board ──────────────────────────────────────────────────────────────────────────────────

/** Card fields. No `…Enc` field; `companyName` / `title` are already masked at ingest (P1d). */
const CARD_SELECT = {
  id: true,
  source: true,
  companyName: true,
  title: true,
  sido: true,
  sigungu: true,
  industryCode: true,
  depopulationArea: true,
  grade: true,
  postedAt: true,
  createdAt: true,
  requestedAt: true,
  nextActionAt: true,
  lastContactedAt: true,
  staffTasks: {
    where: { type: "LEAD_REVIEW", status: { in: ["OPEN", "IN_PROGRESS"] } },
    select: { id: true },
  },
} as const satisfies Prisma.JobLeadSelect;

type CardRow = Prisma.JobLeadGetPayload<{ select: typeof CARD_SELECT }>;

export type LeadCard = Omit<CardRow, "staffTasks"> & LeadPriority & { openReview: boolean };

export type LeadColumn = { grade: LeadGrade; total: number; cards: LeadCard[] };

function toCard(row: CardRow, seekers: readonly PrioritySeeker[], now: Date): LeadCard {
  const { staffTasks, ...rest } = row;
  return { ...rest, ...leadPriority(row, seekers, now), openReview: staffTasks.length > 0 };
}

export async function buildLeadBoard(
  now: Date = new Date(),
  opts: {
    client?: Client;
    scope?: Prisma.JobLeadWhereInput;
    seekerScope?: Prisma.SeekerProfileWhereInput;
    take?: number;
  } = {},
): Promise<LeadColumn[]> {
  const client = opts.client ?? db;
  const take = opts.take ?? ADMIN_LEAD_COLUMN_MAX;
  const seekers = await loadPrioritySeekers(client, opts.seekerScope);
  const where = (grade: LeadGrade): Prisma.JobLeadWhereInput =>
    opts.scope ? { AND: [{ grade }, opts.scope] } : { grade };

  return Promise.all(
    LEAD_COLUMNS.map(async (grade) => {
      const worked = WORKED.includes(grade);
      const [rows, total] = await Promise.all([
        client.jobLead.findMany({
          where: where(grade),
          select: CARD_SELECT,
          ...(worked ? {} : { orderBy: { updatedAt: "desc" as const }, take }),
        }),
        client.jobLead.count({ where: where(grade) }),
      ]);
      const cards = sortByPriority(rows.map((r) => toCard(r, seekers, now))).slice(0, take);
      return { grade, total, cards };
    }),
  );
}

// ─── Detail ─────────────────────────────────────────────────────────────────────────────────

export const LEAD_DETAIL_SELECT = {
  ...CARD_SELECT,
  sourceRef: true,
  payMin: true,
  payMax: true,
  closesAt: true,
  foreignIntent: true,
  archivedAt: true,
  updatedAt: true,
  requestJson: true,
  diagnosisJson: true,
  companyId: true,
  callLogs: {
    orderBy: { at: "desc" },
    select: {
      id: true,
      outcome: true,
      note: true,
      at: true,
      staff: { select: { displayName: true, role: true } },
    },
  },
} as const satisfies Prisma.JobLeadSelect;

export type LeadDetail = Omit<
  Prisma.JobLeadGetPayload<{ select: typeof LEAD_DETAIL_SELECT }>,
  "staffTasks"
> &
  LeadPriority & { openReview: boolean };

export async function getLeadDetail(
  leadId: string,
  now: Date = new Date(),
  client: Client = db,
): Promise<LeadDetail | null> {
  const row = await client.jobLead.findUnique({
    where: { id: leadId },
    select: LEAD_DETAIL_SELECT,
  });
  if (!row) return null;
  const seekers = await loadPrioritySeekers(client);
  const { staffTasks, ...rest } = row;
  return {
    ...rest,
    ...leadPriority(row, seekers, now),
    openReview: staffTasks.length > 0,
  };
}

// ─── Actions ────────────────────────────────────────────────────────────────────────────────

export type LeadActionError =
  | "NOT_FOUND"
  | "LEAD_DNC"
  | "CONFLICT"
  | "NOTE_HAS_CONTACT"
  | "LEAD_STATE"
  | "NOT_REQUESTED"
  | "NO_COMPANY";

export type LeadActionResult =
  { ok: true; grade: LeadGrade } | { ok: false; code: LeadActionError };

/** R-121: records one call and applies the grade rule above. */
export async function recordLeadCall(
  args: {
    actorId: string;
    leadId: string;
    outcome: CallOutcome;
    note?: string | null;
    nextActionAt?: Date | null;
    now?: Date;
  },
  client: Client = db,
): Promise<LeadActionResult> {
  const now = args.now ?? new Date();
  const note = args.note?.trim() || null;
  if (note && hasContacts(note)) return { ok: false, code: "NOTE_HAS_CONTACT" };
  return client
    .$transaction(async (tx) => {
      const lead = await tx.jobLead.findUnique({
        where: { id: args.leadId },
        select: { grade: true, requestedAt: true },
      });
      if (!lead) return { ok: false, code: "NOT_FOUND" } as const;
      if (lead.grade === "DO_NOT_CONTACT") return { ok: false, code: "LEAD_DNC" } as const;

      await tx.callLog.create({
        data: { leadId: args.leadId, staffId: args.actorId, outcome: args.outcome, note, at: now },
      });

      const data: Prisma.JobLeadUncheckedUpdateManyInput = {
        nextActionAt:
          gradeAfterCall(lead.grade, args.outcome) === "DO_NOT_CONTACT"
            ? null
            : (args.nextActionAt ?? null),
      };
      if (args.outcome !== "NO_ANSWER") data.lastContactedAt = now;
      if (args.outcome === "INTERESTED" || args.outcome === "REQUEST_RECEIVED") {
        data.foreignIntent = true;
      }
      if (args.outcome === "NO_INTENT") data.foreignIntent = false;
      if (args.outcome === "REQUEST_RECEIVED" && lead.requestedAt == null) data.requestedAt = now;

      const to = gradeAfterCall(lead.grade, args.outcome);
      if (to) {
        const moved = await transitionLead(tx, {
          leadId: args.leadId,
          from: lead.grade,
          to,
          actorId: args.actorId,
          reason: CALL_REASON[args.outcome] ?? "CALL_INTERESTED",
          now,
          data,
        });
        if (!moved) throw new LeadConflict();
        return { ok: true, grade: to } as const;
      }
      const { count } = await tx.jobLead.updateMany({
        where: { id: args.leadId, grade: lead.grade },
        data,
      });
      if (count === 0) throw new LeadConflict();
      return { ok: true, grade: lead.grade } as const;
    })
    .catch((e: unknown) => {
      if (e instanceof LeadConflict) return { ok: false, code: "CONFLICT" } as const;
      throw e;
    });
}

/** Thrown inside a transaction to roll back the CallLog when the grade moved concurrently. */
class LeadConflict extends Error {}

/**
 * R-121 / BR-05 / WO §8.2: 구인신청(`requestedAt`) + 직원 검증 → A. Requires a B lead with a company
 * name. Closes the lead's open LEAD_REVIEW tasks (P1d 검증 큐).
 */
export async function verifyLead(
  args: { actorId: string; leadId: string; now?: Date },
  client: Client = db,
): Promise<LeadActionResult> {
  const now = args.now ?? new Date();
  return client.$transaction(async (tx) => {
    const lead = await tx.jobLead.findUnique({
      where: { id: args.leadId },
      select: { grade: true, requestedAt: true, companyName: true },
    });
    if (!lead) return { ok: false, code: "NOT_FOUND" } as const;
    if (lead.grade !== "B") return { ok: false, code: "LEAD_STATE" } as const;
    if (!lead.requestedAt) return { ok: false, code: "NOT_REQUESTED" } as const;
    if (!lead.companyName) return { ok: false, code: "NO_COMPANY" } as const;
    const moved = await transitionLead(tx, {
      leadId: args.leadId,
      from: "B",
      to: "A",
      actorId: args.actorId,
      reason: "STAFF_VERIFIED",
      now,
    });
    if (!moved) return { ok: false, code: "CONFLICT" } as const;
    await tx.staffTask.updateMany({
      where: { leadId: args.leadId, type: "LEAD_REVIEW", status: { in: ["OPEN", "IN_PROGRESS"] } },
      data: { status: "DONE", completedAt: now, assigneeId: args.actorId },
    });
    return { ok: true, grade: "A" } as const;
  });
}

export const LEAD_CONTACT_FIELDS = [
  "contactNameEnc",
  "contactPhoneEnc",
  "contactEmailEnc",
] as const;

export type LeadContact = { name: string | null; phone: string | null; email: string | null };

/** R-122: decrypts the lead contact person and writes PII_VIEW (field names only) first. */
export async function revealLeadContact(
  args: { actorId: string; leadId: string },
  client: Client = db,
): Promise<LeadContact | null> {
  const exists = await client.jobLead.findUnique({
    where: { id: args.leadId },
    select: { id: true },
  });
  if (!exists) return null;
  await auditPiiView(
    {
      actorId: args.actorId,
      entity: "JobLead",
      entityId: args.leadId,
      fields: [...LEAD_CONTACT_FIELDS],
    },
    client,
  );
  const row = await client.jobLead.findUniqueOrThrow({
    where: { id: args.leadId },
    select: { contactNameEnc: true, contactPhoneEnc: true, contactEmailEnc: true },
  });
  return { name: row.contactNameEnc, phone: row.contactPhoneEnc, email: row.contactEmailEnc };
}

/** Open LEAD_REVIEW tasks (P1d 검증 큐) for the leads screen, oldest first. */
export async function openLeadReviewTasks(client: Client = db, take = ADMIN_LEAD_COLUMN_MAX) {
  return client.staffTask.findMany({
    where: { type: "LEAD_REVIEW", status: { in: ["OPEN", "IN_PROGRESS"] }, leadId: { not: null } },
    orderBy: { createdAt: "asc" },
    take,
    select: {
      id: true,
      createdAt: true,
      lead: { select: { id: true, title: true, companyName: true, grade: true, sido: true } },
    },
  });
}
