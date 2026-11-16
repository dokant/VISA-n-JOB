/**
 * R-116 / WO §8.2: C leads that were not contacted for LEAD_ARCHIVE_NO_CONTACT_DAYS days, or whose
 * posting has closed, move to ARCHIVED. Pure job handler: `(now) => Promise<Result>` — the clock is
 * a parameter, so tests move time without pg-boss (PLAN 위험 "pg-boss 시간 조작").
 *
 * - "미접촉" = no contact since `lastContactedAt`, or since `createdAt` when never contacted.
 *   A lead with a future `nextActionAt` (call-back booked by staff) is left alone.
 * - "마감" = `closesAt` before `now`.
 * - Only grade C moves (the WO §8.2 arrow starts at C); B / A / DO_NOT_CONTACT are untouched.
 * - Each move is guarded on the grade and writes LEAD_GRADE_CHANGE (actor SYSTEM) in one transaction.
 */
import type { Prisma } from "@prisma/client";

import { LEAD_ARCHIVE_BATCH, LEAD_ARCHIVE_NO_CONTACT_DAYS } from "@/config/limits";
import { SYSTEM_ACTOR } from "@/lib/audit";
import { db } from "@/lib/db";
import { transitionLead } from "@/lib/leads/transitions";

const DAY_MS = 86_400_000;

export type ArchiveLeadsResult = { archived: number; closed: number; noContact: number };

export function staleLeadWhere(now: Date): Prisma.JobLeadWhereInput {
  const cutoff = new Date(now.getTime() - LEAD_ARCHIVE_NO_CONTACT_DAYS * DAY_MS);
  return {
    grade: "C",
    OR: [
      { closesAt: { lt: now } },
      {
        AND: [
          { OR: [{ nextActionAt: null }, { nextActionAt: { lte: now } }] },
          {
            OR: [
              { lastContactedAt: { lte: cutoff } },
              { lastContactedAt: null, createdAt: { lte: cutoff } },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * `scope` narrows the candidates (tests run against a shared database and pass their own rows);
 * the scheduled job always runs over every lead.
 */
export async function archiveStaleLeads(
  now: Date,
  options: { scope?: Prisma.JobLeadWhereInput; client?: typeof db } = {},
): Promise<ArchiveLeadsResult> {
  const client = options.client ?? db;
  const scope = options.scope ?? {};
  const result: ArchiveLeadsResult = { archived: 0, closed: 0, noContact: 0 };
  const skipped = new Set<string>();
  for (;;) {
    const batch = await client.jobLead.findMany({
      where: { AND: [staleLeadWhere(now), scope, { id: { notIn: [...skipped] } }] },
      select: { id: true, closesAt: true },
      orderBy: { createdAt: "asc" },
      take: LEAD_ARCHIVE_BATCH,
    });
    if (batch.length === 0) break;
    for (const lead of batch) {
      const closed = lead.closesAt !== null && lead.closesAt.getTime() < now.getTime();
      const moved = await client.$transaction((tx) =>
        transitionLead(tx, {
          leadId: lead.id,
          from: "C",
          to: "ARCHIVED",
          actorId: SYSTEM_ACTOR,
          reason: closed ? "ARCHIVE_CLOSED" : "ARCHIVE_NO_CONTACT",
          now,
        }),
      );
      if (!moved) {
        skipped.add(lead.id); // changed by someone else meanwhile
        continue;
      }
      result.archived += 1;
      if (closed) result.closed += 1;
      else result.noContact += 1;
    }
  }
  return result;
}
