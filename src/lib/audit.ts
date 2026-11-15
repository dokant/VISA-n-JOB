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

function assertSafeMeta(value: unknown, path: string): void {
  if (typeof value === "string") {
    if (hasContacts(value)) throw new AuditInputError(`meta${path} looks like contact information`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertSafeMeta(v, `${path}[${i}]`));
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, v] of Object.entries(value)) {
      if (FORBIDDEN_META_KEY.test(key)) {
        throw new AuditInputError(`meta${path}.${key} must not be logged`);
      }
      assertSafeMeta(v, `${path}.${key}`);
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
