/**
 * 관리자 기업 검증·계약 등록 (PRD R-218, DECISIONS PC-2, Q-08, Q-17 ①; BR-15).
 *
 * - `listAdminCompanies`: newest companies first, with the decrypted company name (staff screen
 *   only). Showing the names writes one PII_VIEW row per list view (STANDARD 4.7 복호 표시마다,
 *   field name and row count only). The 사업자등록번호 itself is not shown — only whether one is
 *   registered. A company without one was created automatically from a collected lead when a
 *   posting was made (P2a, Q-17 ①): it is marked `autoCreated` so staff can tell a possible
 *   duplicate of a signed-up company. Merging is not done here (reported for a later phase).
 * - `setCompanyVerified` / `setCompanyContract`: change `verified` (+ `verifiedBy`, `verifiedAt`) or
 *   `contractSignedAt` (staff-recorded contract, e.g. on paper) and write AuditLog COMPANY_VERIFY in
 *   the same transaction. Until both are set, the company sees the candidate summary only (R-205).
 */
import { ADMIN_COMPANY_LIST_MAX } from "@/config/limits";
import { writeAudit } from "@/lib/audit";
import { DecryptionError } from "@/lib/crypto";
import { db } from "@/lib/db";
import { STAFF_RECORDED_CONTRACT } from "@/lib/employer/contract";

type Client = typeof db;

/** "YYYY-MM-DD" in Korea (the contract day as staff entered it). */
const KST_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" });

export type AdminCompanyRow = {
  id: string;
  /** null = the stored name could not be decrypted */
  name: string | null;
  hasBizRegNo: boolean;
  autoCreated: boolean;
  industryCode: string;
  sido: string;
  accounts: number;
  verified: boolean;
  verifiedAt: Date | null;
  contractSignedAt: Date | null;
  contractVersion: string | null;
  visaMandateAgreed: boolean;
  createdAt: Date;
};

/**
 * Company names of `ids`. Normally one query; when a stored name cannot be decrypted (wrong key,
 * damaged value) the names are read one by one so a single bad row shows as null instead of
 * breaking the whole verification screen.
 */
async function companyNames(ids: string[], client: Client): Promise<Map<string, string | null>> {
  try {
    const rows = await client.company.findMany({
      where: { id: { in: ids } },
      select: { id: true, nameEnc: true },
    });
    return new Map(rows.map((r) => [r.id, r.nameEnc]));
  } catch (e) {
    if (!(e instanceof DecryptionError)) throw e;
  }
  const names = new Map<string, string | null>();
  for (const id of ids) {
    try {
      const r = await client.company.findUnique({ where: { id }, select: { nameEnc: true } });
      names.set(id, r?.nameEnc ?? null);
    } catch (e) {
      if (!(e instanceof DecryptionError)) throw e;
      names.set(id, null);
    }
  }
  return names;
}

export async function listAdminCompanies(
  actorId: string,
  client: Client = db,
): Promise<AdminCompanyRow[]> {
  const rows = await client.company.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: ADMIN_COMPANY_LIST_MAX,
    select: {
      id: true,
      bizRegNoHash: true,
      industryCode: true,
      sido: true,
      verified: true,
      verifiedAt: true,
      contractSignedAt: true,
      contractVersion: true,
      visaMandateAgreed: true,
      createdAt: true,
      _count: { select: { users: true } },
    },
  });
  const names = await companyNames(
    rows.map((r) => r.id),
    client,
  );
  if (rows.length > 0) {
    await writeAudit(
      {
        actorId,
        action: "PII_VIEW",
        entity: "Company",
        entityId: "LIST",
        // Company ids are not listed in meta: cuids can look like phone numbers to the audit meta
        // contact check. The list is the newest companies at that time (ADMIN_COMPANY_LIST_MAX).
        meta: { fields: ["nameEnc"], count: rows.length },
      },
      client,
    );
  }
  return rows.map((r) => ({
    id: r.id,
    name: names.get(r.id) ?? null,
    hasBizRegNo: r.bizRegNoHash !== null,
    autoCreated: r.bizRegNoHash === null && r._count.users === 0,
    industryCode: r.industryCode,
    sido: r.sido,
    accounts: r._count.users,
    verified: r.verified,
    verifiedAt: r.verifiedAt,
    contractSignedAt: r.contractSignedAt,
    contractVersion: r.contractVersion,
    visaMandateAgreed: r.visaMandateAgreed,
    createdAt: r.createdAt,
  }));
}

export type CompanyChangeResult = { ok: true } | { ok: false; code: "NOT_FOUND" | "SAME_STATE" };

export async function setCompanyVerified(
  args: { actorId: string; companyId: string; verified: boolean; now?: Date },
  client: Client = db,
): Promise<CompanyChangeResult> {
  const now = args.now ?? new Date();
  return client.$transaction(async (tx) => {
    const company = await tx.company.findUnique({
      where: { id: args.companyId },
      select: { verified: true },
    });
    if (!company) return { ok: false as const, code: "NOT_FOUND" as const };
    if (company.verified === args.verified)
      return { ok: false as const, code: "SAME_STATE" as const };
    await tx.company.update({
      where: { id: args.companyId },
      data: args.verified
        ? { verified: true, verifiedBy: args.actorId, verifiedAt: now }
        : { verified: false, verifiedBy: null, verifiedAt: null },
    });
    await writeAudit(
      {
        actorId: args.actorId,
        action: "COMPANY_VERIFY",
        entity: "Company",
        entityId: args.companyId,
        meta: { change: args.verified ? "VERIFY" : "UNVERIFY" },
      },
      tx,
    );
    return { ok: true as const };
  });
}

/** `signedOn` = the contract day (staff record), or null to clear the contract. */
export async function setCompanyContract(
  args: { actorId: string; companyId: string; signedOn: Date | null },
  client: Client = db,
): Promise<CompanyChangeResult> {
  return client.$transaction(async (tx) => {
    const company = await tx.company.findUnique({
      where: { id: args.companyId },
      select: { contractSignedAt: true },
    });
    if (!company) return { ok: false as const, code: "NOT_FOUND" as const };
    const same =
      args.signedOn === null
        ? company.contractSignedAt === null
        : company.contractSignedAt?.getTime() === args.signedOn.getTime();
    if (same) return { ok: false as const, code: "SAME_STATE" as const };
    await tx.company.update({
      where: { id: args.companyId },
      data:
        args.signedOn === null
          ? { contractSignedAt: null, contractVersion: null }
          : { contractSignedAt: args.signedOn, contractVersion: STAFF_RECORDED_CONTRACT },
    });
    await writeAudit(
      {
        actorId: args.actorId,
        action: "COMPANY_VERIFY",
        entity: "Company",
        entityId: args.companyId,
        meta:
          args.signedOn === null
            ? { change: "CONTRACT_CLEAR" }
            : { change: "CONTRACT_SET", signedOn: KST_DAY.format(args.signedOn) },
      },
      tx,
    );
    return { ok: true as const };
  });
}
