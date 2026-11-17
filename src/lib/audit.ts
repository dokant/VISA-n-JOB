/**
 * Audit log writer (BR-15, N-05, PRD R-011, STANDARD 4.8).
 *
 * AuditLog is append-only: this module only ever INSERTs (`auditLog.create`). UPDATE / DELETE /
 * TRUNCATE are rejected by DB triggers (R-006) and forbidden in app code (BR-09).
 * `meta` must never carry plaintext PII: values that look like contacts and keys that name secret
 * or encrypted fields are rejected before the write.
 */
import type { AuditLog, Prisma } from "@prisma/client";

import { db } from "./db";
import { hasContacts } from "./pii-guard";

/** STANDARD 4.8 action list. */
export const AUDIT_ACTIONS = [
  "PII_VIEW", // 관리자 복호 필드 열람
  "PII_EXPORT", // 내보내기 (함수 단위, PC-14)
  "SEEKER_GRADE_CHANGE", // 구직자 등급 변경
  "SEEKER_TRACK_CHANGE", // 트랙 변경
  "LEAD_GRADE_CHANGE", // 리드 등급 전이
  "RECOMMENDATION_CREATE", // 추천 실행
  "POSTING_PUBLISH", // 공고 공개
  "CANDIDATE_BULK_VIEW", // 후보 목록 조회마다 (PC-12)
  "RULE_PUBLISH", // 규칙·점수표 게시
  "CONSENT_REVOKE", // 동의 철회
  "COMPANY_VERIFY", // 기업 검증·계약 등록 (R-218, PC-2)
  // [P1e] PLAN P1e 작업 2 "모두 AuditLog": 등급 조건 확인 항목(상담 완료·체류자격 확인·한국어 확인)과
  // 전환 가능성 판정 입력. STANDARD 4.8 표에 행 추가 요청(P1e 보고).
  "SEEKER_REVIEW_UPDATE",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** `AuditAction.PII_VIEW` style access to the same names. */
export const AuditAction: { readonly [K in AuditAction]: K } = Object.freeze(
  Object.fromEntries(AUDIT_ACTIONS.map((a) => [a, a])) as { [K in AuditAction]: K },
);

/** Actor id for jobs and system transitions (no human actor). */
export const SYSTEM_ACTOR = "SYSTEM";

export type AuditMeta = Prisma.InputJsonObject;

export type AuditInput = {
  actorId: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  meta?: AuditMeta;
};

/** Anything with `auditLog.create` — the app `db`, a test client, or a transaction client. */
export type AuditWriter = {
  auditLog: {
    create(args: { data: Prisma.AuditLogUncheckedCreateInput }): PromiseLike<AuditLog>;
  };
};

export class AuditInputError extends Error {
  readonly code = "AUDIT_INPUT_INVALID";
  constructor(message: string) {
    super(message);
    this.name = "AuditInputError";
  }
}

const FORBIDDEN_META_KEY = /(Enc|password|secret|token|otp|totp)$/i;

/**
 * P2c QA run 2 F-1: database ids in meta (`seekerId`, `interviewId`, `publicIds` …) are random
 * strings, and a cuid such as "cmwj193vm000a6mewt3fb51zr" reads as a messenger id ("fb" + digits)
 * to the contact detector. A value is exempt from the contact check only when BOTH hold:
 * - its key names an identifier: `id`, `…Id`, `…Ids`, `verifiedBy` (a staff user id), and
 * - the value is exactly a cuid or a uuid (Prisma `uuid()`, e.g. `SeekerProfile.publicId`). A cuid
 *   is "c" + lowercase letters / digits only, 21–32 chars in all: Prisma `cuid()` gives 25, and a row
 *   created with a hand-made cuid-like id of another length (seen in the dev DB, 22 chars) must not
 *   make every audited list that includes it fail. No separator ("@", ".", "-", "+", space) fits.
 * Any other string — including a free-form value under an id key — is still checked, so a contact
 * can never reach the audit log under an id-looking key.
 */
const ID_META_KEY = /^(id|verifiedBy)$|Ids?$/;
const CUID = /^c[0-9a-z]{20,31}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** True when `value` is a database identifier (cuid or uuid) and not free text. */
export function isIdentifierValue(value: string): boolean {
  return CUID.test(value) || UUID.test(value);
}

/** Throws AuditInputError when meta carries contact-like text or a secret field. Exported for tests. */
export function assertSafeMeta(value: unknown, path = "", idKey = false): void {
  if (typeof value === "string") {
    if (idKey && isIdentifierValue(value)) return;
    if (hasContacts(value)) throw new AuditInputError(`meta${path} looks like contact information`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertSafeMeta(v, `${path}[${i}]`, idKey));
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, v] of Object.entries(value)) {
      if (FORBIDDEN_META_KEY.test(key)) {
        throw new AuditInputError(`meta${path}.${key} must not be logged`);
      }
      assertSafeMeta(v, `${path}.${key}`, ID_META_KEY.test(key));
    }
  }
}

export function isAuditAction(value: unknown): value is AuditAction {
  return typeof value === "string" && (AUDIT_ACTIONS as readonly string[]).includes(value);
}

/**
 * Appends one AuditLog row. Pass a transaction client as `client` so the log commits (or rolls
 * back) together with the change it records.
 */
export async function writeAudit(input: AuditInput, client: AuditWriter = db): Promise<AuditLog> {
  if (!isAuditAction(input.action)) {
    throw new AuditInputError(`unknown audit action ${String(input.action)}`);
  }
  for (const key of ["actorId", "entity", "entityId"] as const) {
    if (typeof input[key] !== "string" || input[key].trim() === "") {
      throw new AuditInputError(`${key} is required`);
    }
  }
  if (input.meta !== undefined) assertSafeMeta(input.meta, "");
  return client.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      meta: input.meta,
    },
  });
}

/** R-122: an admin screen showed decrypted fields of one record. Field names only, never values. */
export function auditPiiView(
  args: { actorId: string; entity: string; entityId: string; fields: string[] },
  client?: AuditWriter,
): Promise<AuditLog> {
  return writeAudit(
    {
      actorId: args.actorId,
      action: "PII_VIEW",
      entity: args.entity,
      entityId: args.entityId,
      meta: { fields: args.fields },
    },
    client,
  );
}

/**
 * PC-14: there is no export feature in Phase 0~2. Any future export must call this before
 * handing data out. `entityId` is the export batch id; ids of the exported rows are not logged.
 */
export function auditPiiExport(
  args: { actorId: string; entity: string; batchId: string; rowCount: number; fields: string[] },
  client?: AuditWriter,
): Promise<AuditLog> {
  return writeAudit(
    {
      actorId: args.actorId,
      action: "PII_EXPORT",
      entity: args.entity,
      entityId: args.batchId,
      meta: { rowCount: args.rowCount, fields: args.fields },
    },
    client,
  );
}
