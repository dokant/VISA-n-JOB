/**
 * 노쇼 처리 (PRD R-213, WO §7.7): `SeekerProfile.noShowCount` = the number of the seeker's interviews
 * whose recorded result is NO_SHOW. With NO_SHOW_DEPRIORITIZE_COUNT (2) or more the seeker is listed
 * after the others in 추천 (src/lib/recommendations/matching.ts) and marked on staff screens —
 * internal only: the count never reaches the blind serializer or any company screen (BR-02).
 *
 * - `recountNoShows` sets the count from the interview results. It is called right after a result is
 *   recorded (src/lib/recommendations/interviews.ts), in the same transaction — a result changed
 *   from NO_SHOW to something else lowers the count again, so the count always matches the records.
 * - `syncNoShowCounts(now)` is the nightly job: it recounts every seeker whose stored count differs
 *   from the records (a repair pass; normally there is nothing to do). Clock injected for the job
 *   interface, the count itself does not depend on time.
 */
import type { Prisma } from "@prisma/client";

import { NO_SHOW_DEPRIORITIZE_COUNT, SEEKER_JOB_BATCH } from "@/config/limits";
import { db } from "@/lib/db";

type Client = typeof db;
type Tx = Parameters<Parameters<Client["$transaction"]>[0]>[0];

export const NO_SHOW_RESULT = "NO_SHOW";

/** True when the seeker is listed after the others in 추천 (내부 표시). */
export function isNoShowDeprioritized(noShowCount: number): boolean {
  return noShowCount >= NO_SHOW_DEPRIORITIZE_COUNT;
}

/** Seekers that are NOT deprioritized (query form of `!isNoShowDeprioritized`). */
export const NO_SHOW_OK_WHERE = {
  noShowCount: { lt: NO_SHOW_DEPRIORITIZE_COUNT },
} as const satisfies Prisma.SeekerProfileWhereInput;

/** Sets `noShowCount` of one seeker from the interview results; returns the new count. */
export async function recountNoShows(seekerId: string, client: Client | Tx = db): Promise<number> {
  const count = await client.interview.count({
    where: { result: NO_SHOW_RESULT, recommendation: { seekerId } },
  });
  await client.seekerProfile.updateMany({
    where: { id: seekerId, noShowCount: { not: count } },
    data: { noShowCount: count },
  });
  return count;
}

export type NoShowSyncResult = { checked: number; updated: number };

/** Nightly repair: seekers whose stored count differs from their NO_SHOW interview results. */
export async function syncNoShowCounts(
  _now: Date,
  options: { client?: Client; scope?: Prisma.SeekerProfileWhereInput } = {},
): Promise<NoShowSyncResult> {
  const client = options.client ?? db;
  const scope = options.scope ?? {};
  const result: NoShowSyncResult = { checked: 0, updated: 0 };
  // Candidates: a stored count above 0, or at least one NO_SHOW interview.
  const where: Prisma.SeekerProfileWhereInput = {
    AND: [
      scope,
      {
        OR: [
          { noShowCount: { gt: 0 } },
          { recommendations: { some: { interviews: { some: { result: NO_SHOW_RESULT } } } } },
        ],
      },
    ],
  };
  let cursor: string | undefined;
  for (;;) {
    const batch = await client.seekerProfile.findMany({
      where,
      select: { id: true, noShowCount: true },
      orderBy: { id: "asc" },
      take: SEEKER_JOB_BATCH,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (batch.length === 0) return result;
    for (const row of batch) {
      result.checked += 1;
      const count = await recountNoShows(row.id, client);
      if (count !== row.noShowCount) result.updated += 1;
    }
    cursor = batch[batch.length - 1].id;
  }
}
