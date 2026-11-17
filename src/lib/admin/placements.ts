/**
 * 계약(Placement) 기본 관리 (PRD R-216, WO §6.5 계약·체류 사건). Permission `placement:manage`
 * (STAFF_PLACEMENT·ADMIN) is checked by the caller's first statement (server action / page).
 *
 * A placement records the employment contract that followed one recommendation (one per
 * recommendation, `recommendationId` unique). Create and update only: there is no delete — placement
 * and recommendation records are 소개 기록 kept under the retention policy (WO §11 [전문가 검토 필요]).
 * No personal data is read here (no decrypted fields).
 */
import { Prisma } from "@prisma/client";

import { ADMIN_LIST_MAX } from "@/config/limits";
import { db } from "@/lib/db";
import { findRecommendation, findRecommendations } from "@/lib/recommendations/ledger";
import type { FeeStatus } from "@/schemas/admin/placements";

type Client = typeof db;

export type PlacementFields = {
  contractDate: Date;
  monthlyWage: number;
  feeAmount: number;
  feeStatus: FeeStatus;
};

export type PlacementResult =
  { ok: true; id: string } | { ok: false; code: "NOT_FOUND" | "PLACEMENT_EXISTS" };

export function listPlacements(client: Client = db, take = ADMIN_LIST_MAX) {
  return client.placement.findMany({
    orderBy: [{ contractDate: "desc" }, { id: "asc" }],
    take,
    select: {
      id: true,
      contractDate: true,
      monthlyWage: true,
      feeAmount: true,
      feeStatus: true,
      updatedAt: true,
      recommendation: {
        select: {
          id: true,
          recommendedAt: true,
          seekerId: true,
          company: { select: { industryCode: true, sido: true } },
          posting: { select: { blindTitle: true } },
        },
      },
    },
  });
}

/** Recommendations without a placement yet (newest first), for the create form. */
export function recommendationsWithoutPlacement(client: Client = db, take = ADMIN_LIST_MAX) {
  return findRecommendations(
    {
      where: { placement: { is: null } },
      take,
      select: {
        id: true,
        recommendedAt: true,
        seekerId: true,
        company: { select: { industryCode: true, sido: true } },
        posting: { select: { blindTitle: true } },
        interviews: { select: { result: true } },
      },
    },
    client,
  );
}

export async function createPlacement(
  args: { recommendationId: string } & PlacementFields,
  client: Client = db,
): Promise<PlacementResult> {
  const rec = await findRecommendation(args.recommendationId, { id: true }, client);
  if (!rec) return { ok: false, code: "NOT_FOUND" };
  try {
    const row = await client.placement.create({
      data: {
        recommendationId: rec.id,
        contractDate: args.contractDate,
        monthlyWage: args.monthlyWage,
        feeAmount: args.feeAmount,
        feeStatus: args.feeStatus,
      },
      select: { id: true },
    });
    return { ok: true, id: row.id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, code: "PLACEMENT_EXISTS" };
    }
    throw e;
  }
}

export async function updatePlacement(
  args: { placementId: string } & PlacementFields,
  client: Client = db,
): Promise<PlacementResult> {
  const r = await client.placement.updateMany({
    where: { id: args.placementId },
    data: {
      contractDate: args.contractDate,
      monthlyWage: args.monthlyWage,
      feeAmount: args.feeAmount,
      feeStatus: args.feeStatus,
    },
  });
  return r.count === 1 ? { ok: true, id: args.placementId } : { ok: false, code: "NOT_FOUND" };
}
