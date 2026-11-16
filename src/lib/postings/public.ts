/**
 * Public blind postings (PRD R-202; WO §8.5, §15-3, §15-4; BR-03, BR-04, BR-05).
 *
 * The only query that reads postings for `/[locale]/jobs`, `/api/jobs` and 면접 신청. A posting is
 * public when ALL of these hold (checked in the query, not on the screen):
 * - status PUBLISHED (WO §8.5),
 * - verifiedAt and verifiedBy set (WO §15-4; the DB CHECK enforces it for PUBLISHED as well),
 * - its lead is still grade A (BR-05, WO §15-3: a posting whose lead is C·B or later moved to
 *   보관·재접촉금지 is never shown, so no C·B lead can surface on /jobs even through a bad write).
 * Rows leave this module only as `PublicPosting` (src/lib/serializers/publicPosting.ts).
 * The caller checks FEATURE_PUBLIC_JOBS (SC-07).
 */
import type { Prisma } from "@prisma/client";

import { PUBLIC_POSTING_LIST_MAX } from "@/config/limits";
import { db } from "@/lib/db";
import {
  PUBLIC_POSTING_SELECT,
  type PublicPosting,
  serializePublicPosting,
} from "@/lib/serializers/publicPosting";

type Client = typeof db;

export const PUBLIC_POSTING_WHERE = {
  status: "PUBLISHED",
  verifiedAt: { not: null },
  verifiedBy: { not: null },
  lead: { is: { grade: "A" } },
} as const satisfies Prisma.JobPostingWhereInput;

export async function listPublicPostings(
  client: Client = db,
  take: number = PUBLIC_POSTING_LIST_MAX,
): Promise<PublicPosting[]> {
  const rows = await client.jobPosting.findMany({
    where: PUBLIC_POSTING_WHERE,
    select: PUBLIC_POSTING_SELECT,
    orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
    take,
  });
  return rows.map((r) => serializePublicPosting(r));
}

export async function getPublicPosting(
  id: string,
  client: Client = db,
): Promise<PublicPosting | null> {
  if (typeof id !== "string" || id.length === 0 || id.length > 64) return null;
  const row = await client.jobPosting.findFirst({
    where: { id, ...PUBLIC_POSTING_WHERE },
    select: PUBLIC_POSTING_SELECT,
  });
  return row ? serializePublicPosting(row) : null;
}
