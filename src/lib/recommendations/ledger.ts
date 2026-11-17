/**
 * Recommendation ledger repository (BR-09, PRD R-209, WO §15-7, STANDARD 4.8 / S-47).
 *
 * The ONLY module that writes Recommendation rows, and it can only add them: it exposes `create`
 * and `find` functions, no update / delete / upsert. The database refuses UPDATE / DELETE /
 * TRUNCATE as well (migration `ledger_triggers`), and `pnpm qa:static` fails on any
 * `recommendation.(update|delete|upsert|updateMany|deleteMany)` in src/ (BR-09/ledger-mutation)
 * and on `recommendation.create` outside this file (BR-09/ledger-repository).
 *
 * Every insert writes AuditLog RECOMMENDATION_CREATE in the same transaction (BR-15). The meta holds
 * ids and codes only (no personal data). A second identical recommendation (same seeker, company
 * and posting) is not added — the caller gets the existing row (`already: true`); an advisory lock
 * per (seeker, company, posting) makes concurrent double submits safe.
 */
import type { Prisma, Recommendation } from "@prisma/client";

import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";

type Client = typeof db;
type Tx = Parameters<Parameters<Client["$transaction"]>[0]>[0];

export type RecommendationInput = {
  seekerId: string;
  companyId: string;
  postingId: string | null;
  staffId: string;
  note: string | null;
  /** Interest request answered by this recommendation (its status becomes RECOMMENDED). */
  interestRequestId?: string | null;
  now?: Date;
};

export type CreateRecommendationResult = { recommendation: Recommendation; already: boolean };

function lockKey(i: RecommendationInput): string {
  return `recommendation:${i.seekerId}:${i.companyId}:${i.postingId ?? "-"}`;
}

/** Appends one recommendation + its audit row (one transaction). */
export async function createRecommendation(
  input: RecommendationInput,
  client: Client = db,
): Promise<CreateRecommendationResult> {
  const now = input.now ?? new Date();
  return client.$transaction(async (tx: Tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey(input)}))`;
    const existing = await tx.recommendation.findFirst({
      where: { seekerId: input.seekerId, companyId: input.companyId, postingId: input.postingId },
      orderBy: { recommendedAt: "asc" },
    });
    if (existing) {
      if (input.interestRequestId) await markInterestRecommended(tx, input.interestRequestId);
      return { recommendation: existing, already: true };
    }
    const recommendation = await tx.recommendation.create({
      data: {
        seekerId: input.seekerId,
        companyId: input.companyId,
        postingId: input.postingId,
        staffId: input.staffId,
        note: input.note,
        recommendedAt: now,
      },
    });
    await writeAudit(
      {
        actorId: input.staffId,
        action: "RECOMMENDATION_CREATE",
        entity: "Recommendation",
        entityId: recommendation.id,
        meta: {
          seekerId: input.seekerId,
          companyId: input.companyId,
          postingId: input.postingId,
          interestRequestId: input.interestRequestId ?? null,
          hasNote: input.note !== null,
        },
      },
      tx,
    );
    if (input.interestRequestId) await markInterestRecommended(tx, input.interestRequestId);
    return { recommendation, already: false };
  });
}

async function markInterestRecommended(tx: Tx, interestRequestId: string): Promise<void> {
  await tx.interestRequest.updateMany({
    where: { id: interestRequestId, status: "RECEIVED" },
    data: { status: "RECOMMENDED" },
  });
}

export async function findRecommendation<S extends Prisma.RecommendationSelect>(
  id: string,
  select: S,
  client: Client = db,
): Promise<Prisma.RecommendationGetPayload<{ select: S }> | null> {
  return client.recommendation.findUnique({
    where: { id },
    select,
  }) as Promise<Prisma.RecommendationGetPayload<{ select: S }> | null>;
}

export async function findRecommendations<S extends Prisma.RecommendationSelect>(
  args: {
    where: Prisma.RecommendationWhereInput;
    select: S;
    take?: number;
    orderBy?: Prisma.RecommendationOrderByWithRelationInput[];
  },
  client: Client = db,
): Promise<Prisma.RecommendationGetPayload<{ select: S }>[]> {
  return client.recommendation.findMany({
    where: args.where,
    select: args.select,
    take: args.take,
    orderBy: args.orderBy ?? [{ recommendedAt: "desc" }, { id: "asc" }],
  }) as Promise<Prisma.RecommendationGetPayload<{ select: S }>[]>;
}
