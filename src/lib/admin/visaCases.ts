/**
 * 체류 사건(VisaCase) 기본 관리 (PRD R-216, WO §6.5, §11 직원 권한 분리, BR-13).
 *
 * WO §11: STAFF_PLACEMENT sees contacts but NOT stay case details; STAFF_VISA the reverse; ADMIN both.
 * Every function here takes the acting staff member and checks `visaCase:view` / `visaCase:manage`
 * itself (`assertCan`, AuthzError 403) — on top of the first-statement check of the page or server
 * action — so no caller can read a case for a STAFF_PLACEMENT session by mistake.
 * BR-13: the model has no 고유식별정보 column and these functions take no such value (Phase 3).
 * No delete: a case is closed with status CLOSED (records kept, WO §11 [전문가 검토 필요]).
 */
import type { Role } from "@prisma/client";

import { ADMIN_LIST_MAX } from "@/config/limits";
import { db } from "@/lib/db";
import { assertCan } from "@/lib/rbac";
import type { VisaCaseStatus, VisaCaseType } from "@/schemas/admin/visaCases";

type Client = typeof db;
type Actor = { id: string; role: Role };

export type VisaCaseFields = {
  caseType: VisaCaseType;
  targetVisa: string | null;
  status: VisaCaseStatus;
  companyId: string | null;
  mandateSignedAt: Date | null;
  fee: number | null;
};

export type VisaCaseResult =
  | { ok: true; id: string }
  | { ok: false; code: "NOT_FOUND" | "UNKNOWN_VISA" | "COMPANY_NOT_FOUND" };

const CASE_SELECT = {
  id: true,
  seekerId: true,
  companyId: true,
  caseType: true,
  targetVisa: true,
  status: true,
  mandateSignedAt: true,
  fee: true,
  createdAt: true,
  updatedAt: true,
  seeker: { select: { visaCode: true, stayExpiry: true, grade: true } },
  company: { select: { industryCode: true, sido: true } },
} as const;

export function listVisaCases(actor: Actor, client: Client = db, take = ADMIN_LIST_MAX) {
  assertCan(actor, "visaCase:view");
  return client.visaCase.findMany({
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    take,
    select: CASE_SELECT,
  });
}

/** 체류 사건 상세 — refused (AuthzError 403) for STAFF_PLACEMENT (R-216). */
export function getVisaCase(actor: Actor, id: string, client: Client = db) {
  assertCan(actor, "visaCase:view");
  return client.visaCase.findUnique({ where: { id }, select: CASE_SELECT });
}

async function checkRefs(
  f: Pick<VisaCaseFields, "targetVisa" | "companyId">,
  client: Client,
): Promise<VisaCaseResult | null> {
  if (f.targetVisa) {
    const visa = await client.visaType.count({ where: { code: f.targetVisa } });
    if (visa === 0) return { ok: false, code: "UNKNOWN_VISA" };
  }
  if (f.companyId) {
    const company = await client.company.count({ where: { id: f.companyId } });
    if (company === 0) return { ok: false, code: "COMPANY_NOT_FOUND" };
  }
  return null;
}

export async function createVisaCase(
  actor: Actor,
  args: { seekerId: string } & VisaCaseFields,
  client: Client = db,
): Promise<VisaCaseResult> {
  assertCan(actor, "visaCase:manage");
  const seeker = await client.seekerProfile.count({ where: { id: args.seekerId } });
  if (seeker === 0) return { ok: false, code: "NOT_FOUND" };
  const bad = await checkRefs(args, client);
  if (bad) return bad;
  const row = await client.visaCase.create({
    data: {
      seekerId: args.seekerId,
      companyId: args.companyId,
      caseType: args.caseType,
      targetVisa: args.targetVisa,
      status: args.status,
      mandateSignedAt: args.mandateSignedAt,
      fee: args.fee,
    },
    select: { id: true },
  });
  return { ok: true, id: row.id };
}

export async function updateVisaCase(
  actor: Actor,
  args: { visaCaseId: string } & VisaCaseFields,
  client: Client = db,
): Promise<VisaCaseResult> {
  assertCan(actor, "visaCase:manage");
  const bad = await checkRefs(args, client);
  if (bad) return bad;
  const r = await client.visaCase.updateMany({
    where: { id: args.visaCaseId },
    data: {
      companyId: args.companyId,
      caseType: args.caseType,
      targetVisa: args.targetVisa,
      status: args.status,
      mandateSignedAt: args.mandateSignedAt,
      fee: args.fee,
    },
  });
  return r.count === 1 ? { ok: true, id: args.visaCaseId } : { ok: false, code: "NOT_FOUND" };
}
