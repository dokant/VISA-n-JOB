/**
 * 기업 블라인드 후보 열람 (PRD R-205, R-207; WO §9.3; BR-02, BR-06, BR-07, BR-15).
 *
 * `browseCandidates` is the only way an employer gets candidate rows:
 * 1. the company must have `LIST` access (verified + contract, src/lib/candidates/access.ts);
 * 2. one view is counted against the company's daily cap (`CANDIDATE_VIEWS_PER_DAY`, a Korean
 *    calendar day, RateLimitBucket). Over the cap → `RATE_LIMITED` (HTTP 429 in the API);
 * 3. eligible seekers only (`eligibleCandidateWhere`: S·A, JOB_MATCH — E-9/E-10 are FUTURE_POOL —,
 *    ACTIVE, active job search, BLIND_PROFILE not revoked, stay not expired) + the 8 filters;
 * 4. every row is serialized by `serializeBlindSeeker` (WO §7.5 keys only);
 * 5. every list view — and every refused view — writes AuditLog `CANDIDATE_BULK_VIEW` (PC-12) with
 *    the filter codes, the number of rows and their public ids (no personal data).
 */
import type { Prisma } from "@prisma/client";

import { CANDIDATE_LIST_MAX, CANDIDATE_VIEWS_PER_DAY } from "@/config/limits";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rateLimit";
import {
  BLIND_SEEKER_SELECT,
  type BlindSeeker,
  serializeBlindSeeker,
} from "@/lib/serializers/blindSeeker";
import type { CandidateFilters } from "@/schemas/employer/candidates";

import { candidateAccessOf } from "./access";
import { candidateFilterWhere, eligibleCandidateWhere } from "./eligible";

type Client = typeof db;

const DAY_SEC = 86_400;
const KST_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" });

/** 00:00 in Korea of the day that contains `now`. */
export function kstDayStart(now: Date): Date {
  return new Date(`${KST_DAY.format(now)}T00:00:00+09:00`);
}

/** RateLimitBucket key of a company's candidate views (one window per Korean calendar day). */
export function candidateViewKey(companyId: string): string {
  return `candidateView:company:${companyId}`;
}

/**
 * Counts one view. The window start is derived from the Korean day start, so every view of the same
 * Korean day falls into one bucket row (the next day starts a new one).
 */
export async function consumeCandidateView(
  companyId: string,
  now: Date = new Date(),
  client: Client = db,
): Promise<{ ok: true; remaining: number } | { ok: false; retryAfterSec: number }> {
  const dayStart = kstDayStart(now);
  const r = await consumeRateLimit(
    candidateViewKey(companyId),
    { limit: CANDIDATE_VIEWS_PER_DAY, windowSec: DAY_SEC },
    dayStart,
    client,
  );
  if (r.ok) return r;
  const next = dayStart.getTime() + DAY_SEC * 1000;
  return { ok: false, retryAfterSec: Math.max(1, Math.ceil((next - now.getTime()) / 1000)) };
}

/** Friend-code groups (WO §7.5 `groupApplySize`): members per seeker id, ≥ 2 only. */
export async function groupApplySizes(
  rows: readonly {
    id: string;
    groupApply: boolean;
    groupFriendCode: string | null;
    referralCode: string;
  }[],
  client: Client = db,
): Promise<Map<string, number>> {
  const anchors = new Map<string, string>();
  for (const r of rows) {
    if (r.groupApply) anchors.set(r.id, r.groupFriendCode ?? r.referralCode);
  }
  const sizes = new Map<string, number>();
  if (anchors.size === 0) return sizes;
  const codes = [...new Set(anchors.values())];
  const members = await client.seekerProfile.findMany({
    where: {
      groupApply: true,
      OR: [{ referralCode: { in: codes } }, { groupFriendCode: { in: codes } }],
    },
    select: { referralCode: true, groupFriendCode: true },
  });
  for (const [id, anchor] of anchors) {
    const n = members.filter(
      (m) => m.referralCode === anchor || m.groupFriendCode === anchor,
    ).length;
    if (n > 1) sizes.set(id, n);
  }
  return sizes;
}

/**
 * Active VisaType codes (P2b QA O-5): `convertibleVisa` outside this set is sent as null, the same
 * rule as the candidate card (src/components/employer/candidate-view.ts shows active types only).
 */
export async function activeVisaCodes(client: Client = db): Promise<ReadonlySet<string>> {
  const rows = await client.visaType.findMany({ where: { active: true }, select: { code: true } });
  return new Set(rows.map((r) => r.code));
}

const LIST_SELECT = {
  ...BLIND_SEEKER_SELECT,
  id: true,
  groupApply: true,
  groupFriendCode: true,
  referralCode: true,
} as const satisfies Prisma.SeekerProfileSelect;

/** Eligible + filtered candidates, serialized (no access check, no counting — internal). */
export async function queryCandidates(
  filters: CandidateFilters,
  now: Date = new Date(),
  client: Client = db,
): Promise<BlindSeeker[]> {
  const rows = await client.seekerProfile.findMany({
    where: { AND: [eligibleCandidateWhere(now), candidateFilterWhere(filters, now)] },
    // SeekerGrade enum order is B < A < S, so desc lists S (우선 추천) first.
    orderBy: [{ grade: "desc" }, { updatedAt: "desc" }, { id: "asc" }],
    take: CANDIDATE_LIST_MAX,
    select: LIST_SELECT,
  });
  const groups = await groupApplySizes(rows, client);
  const visaCodes = await activeVisaCodes(client);
  return rows.map((row) =>
    serializeBlindSeeker(row, { now, groupApplySize: groups.get(row.id) ?? null, visaCodes }),
  );
}

/**
 * P2d 선행 A-5: the free-form code filters (`visa`, `convertible`, `industry`) are kept only when they
 * are codes of the reference lists (VisaType, Industry); any other value is dropped (`""`) —
 * ignored by the query and never written to the audit meta, so an odd query string cannot make the
 * audit write (contact check) fail. The other filters are fixed lists already (schema).
 */
export async function knownCandidateFilters(
  filters: CandidateFilters,
  client: Client = db,
): Promise<CandidateFilters> {
  const needsVisa = filters.visa !== "" || filters.convertible !== "";
  const [visaCodes, industries] = await Promise.all([
    needsVisa
      ? client.visaType
          .findMany({ select: { code: true } })
          .then((rows) => new Set(rows.map((r) => r.code)))
      : Promise.resolve(new Set<string>()),
    filters.industry !== ""
      ? client.industry
          .findMany({ select: { code: true } })
          .then((rows) => new Set(rows.map((r) => r.code)))
      : Promise.resolve(new Set<string>()),
  ]);
  return {
    ...filters,
    visa: visaCodes.has(filters.visa) ? filters.visa : "",
    convertible: visaCodes.has(filters.convertible) ? filters.convertible : "",
    industry: industries.has(filters.industry) ? filters.industry : "",
  };
}

function filterMeta(filters: CandidateFilters): Prisma.InputJsonObject {
  return Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ""));
}

/** `filters` = the filters actually applied (unknown codes dropped, `knownCandidateFilters`). */
export type BrowseResult =
  | { ok: true; candidates: BlindSeeker[]; remaining: number; filters: CandidateFilters }
  | { ok: false; code: "NOT_CONTRACTED" }
  | { ok: false; code: "RATE_LIMITED"; retryAfterSec: number; filters: CandidateFilters };

export async function browseCandidates(
  args: {
    actor: { id: string; companyId: string };
    filters: CandidateFilters;
    now?: Date;
  },
  client: Client = db,
): Promise<BrowseResult> {
  const now = args.now ?? new Date();
  const { actor } = args;
  const access = await candidateAccessOf(actor.companyId, client);
  if (access.level !== "LIST") return { ok: false, code: "NOT_CONTRACTED" };
  const filters = await knownCandidateFilters(args.filters, client);

  const view = await consumeCandidateView(actor.companyId, now, client);
  if (!view.ok) {
    await writeAudit(
      {
        actorId: actor.id,
        action: "CANDIDATE_BULK_VIEW",
        entity: "Company",
        entityId: actor.companyId,
        meta: {
          refused: "DAILY_LIMIT",
          limit: CANDIDATE_VIEWS_PER_DAY,
          filters: filterMeta(filters),
        },
      },
      client,
    );
    return { ok: false, code: "RATE_LIMITED", retryAfterSec: view.retryAfterSec, filters };
  }

  const candidates = await queryCandidates(filters, now, client);
  await writeAudit(
    {
      actorId: actor.id,
      action: "CANDIDATE_BULK_VIEW",
      entity: "Company",
      entityId: actor.companyId,
      meta: {
        filters: filterMeta(filters),
        resultCount: candidates.length,
        publicIds: candidates.map((c) => c.publicId),
      },
    },
    client,
  );
  return { ok: true, candidates, remaining: view.remaining, filters };
}
