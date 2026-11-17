/**
 * 규칙 DB·점수표 관리 (PRD R-215, WO §6.5 "규칙 DB / 점수표", WO §10, BR-11, BR-12, BR-15).
 *
 * Life cycle of a version: DRAFT → PUBLISHED → RETIRED.
 * - Versions: VisaRule versions share a `ruleKey`, ScoreTable versions share a `name`; `version` is
 *   1, 2, … within that group (unique). "새 버전" copies the latest version into a new DRAFT; only one
 *   DRAFT per group at a time. Only a DRAFT can be edited.
 * - 게시 (DRAFT → PUBLISHED): `rules:publish` (STAFF_VISA·ADMIN — "STAFF_VISA 이상", checked by the
 *   server action) records `reviewedBy` (the staff user) and `reviewedAt`, and retires the group's
 *   previous PUBLISHED version in the same transaction, so a group never has two published versions.
 *   A SAMPLE version (seed data, `isSample` — the JSON still carries `"__sample": true`) cannot be
 *   published: the operator must remove the marker after entering real values (BR-12).
 * - 폐기 (PUBLISHED → RETIRED): the version stops being used at once.
 * - Public calculations (visa-engine/evaluate.ts, employer diagnosis, score/e74.ts) read PUBLISHED
 *   rows only, so a DRAFT or RETIRED version never affects /visa-check, the score calculator or the
 *   employer diagnosis.
 * - Audit: 게시 and 폐기 write AuditLog RULE_PUBLISH (STANDARD 4.8 "규칙·점수표 게시") with
 *   `meta.change` PUBLISH / RETIRE — the same pattern as COMPANY_VERIFY with VERIFY / UNVERIFY.
 *   Drafts (create / edit / new version) have no public effect and no audit action in 4.8.
 * - Values are typed by people (행정사). Nothing here invents a legal requirement or a point value.
 */
import { randomUUID } from "node:crypto";

import { Prisma, type RuleStatus } from "@prisma/client";

import { ADMIN_RULE_LIST_MAX } from "@/config/limits";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  parseConditions,
  parseScoreItems,
  type ScoreTableDraftInput,
  type VisaRuleDraftInput,
} from "@/schemas/admin/rules";

import { isRuleMessageKey } from "./messageKeys";

type Client = typeof db;
type Tx = Parameters<Parameters<Client["$transaction"]>[0]>[0];

export type RuleErrorCode =
  | "NOT_FOUND"
  | "NOT_DRAFT"
  | "NOT_PUBLISHED"
  | "DRAFT_EXISTS"
  | "SAMPLE_NOT_PUBLISHABLE"
  | "INVALID_JSON"
  | "INVALID_SHAPE"
  | "UNKNOWN_VISA"
  | "UNKNOWN_INDUSTRY"
  | "UNKNOWN_MESSAGE_KEY";

export type RuleResult<T = object> = ({ ok: true } & T) | { ok: false; code: RuleErrorCode };

/** True when the stored JSON still carries the seed SAMPLE marker (`"__sample": true`). */
export function hasSampleMarker(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>).__sample === true
  );
}

function validId(id: string): boolean {
  return typeof id === "string" && id.length > 0 && id.length <= 64;
}

// ─── VisaRule ─────────────────────────────────────────────────────────────────────────────

const RULE_LIST_SELECT = {
  id: true,
  ruleKey: true,
  visaCode: true,
  industryCode: true,
  outcome: true,
  messageKey: true,
  version: true,
  status: true,
  isSample: true,
  reviewedBy: true,
  reviewedAt: true,
  createdAt: true,
} as const satisfies Prisma.VisaRuleSelect;

export function listVisaRules(client: Client = db) {
  return client.visaRule.findMany({
    orderBy: [{ visaCode: "asc" }, { ruleKey: "asc" }, { version: "desc" }],
    take: ADMIN_RULE_LIST_MAX,
    select: RULE_LIST_SELECT,
  });
}

/** One version with every version of the same rule (newest first). */
export async function getVisaRule(id: string, client: Client = db) {
  if (!validId(id)) return null;
  const rule = await client.visaRule.findUnique({ where: { id } });
  if (!rule) return null;
  const versions = await client.visaRule.findMany({
    where: { ruleKey: rule.ruleKey },
    orderBy: { version: "desc" },
    select: RULE_LIST_SELECT,
  });
  return { rule, versions };
}

type CheckedRule = {
  visaCode: string;
  industryCode: string | null;
  outcome: VisaRuleDraftInput["outcome"];
  messageKey: string;
  conditions: Prisma.InputJsonObject;
  isSample: boolean;
};

async function checkRuleInput(
  input: VisaRuleDraftInput,
  client: Client | Tx,
): Promise<RuleResult<{ value: CheckedRule }>> {
  const conditions = parseConditions(input.conditions);
  if (!conditions.ok) return { ok: false, code: conditions.code };
  const [visa, industry] = await Promise.all([
    client.visaType.findUnique({ where: { code: input.visaCode }, select: { code: true } }),
    input.industryCode
      ? client.industry.findUnique({ where: { code: input.industryCode }, select: { code: true } })
      : Promise.resolve({ code: null }),
  ]);
  if (!visa) return { ok: false, code: "UNKNOWN_VISA" };
  if (!industry) return { ok: false, code: "UNKNOWN_INDUSTRY" };
  if (!isRuleMessageKey(input.messageKey)) return { ok: false, code: "UNKNOWN_MESSAGE_KEY" };
  return {
    ok: true,
    value: {
      visaCode: visa.code,
      industryCode: input.industryCode,
      outcome: input.outcome,
      messageKey: input.messageKey,
      conditions: conditions.value as Prisma.InputJsonObject,
      isSample: hasSampleMarker(conditions.value),
    },
  };
}

/** 새 규칙: a new rule group (new ruleKey), version 1, DRAFT. */
export async function createVisaRule(
  input: VisaRuleDraftInput,
  client: Client = db,
): Promise<RuleResult<{ id: string }>> {
  const checked = await checkRuleInput(input, client);
  if (!checked.ok) return checked;
  const row = await client.visaRule.create({
    data: { ...checked.value, ruleKey: randomUUID(), version: 1, status: "DRAFT" },
    select: { id: true },
  });
  return { ok: true, id: row.id };
}

/** Edits a DRAFT version (any other status is refused: NOT_DRAFT). */
export async function updateVisaRuleDraft(
  id: string,
  input: VisaRuleDraftInput,
  client: Client = db,
): Promise<RuleResult> {
  if (!validId(id)) return { ok: false, code: "NOT_FOUND" };
  const checked = await checkRuleInput(input, client);
  if (!checked.ok) return checked;
  const r = await client.visaRule.updateMany({
    where: { id, status: "DRAFT" },
    data: checked.value,
  });
  if (r.count === 1) return { ok: true };
  return (await client.visaRule.count({ where: { id } }))
    ? { ok: false, code: "NOT_DRAFT" }
    : { ok: false, code: "NOT_FOUND" };
}

async function lock(tx: Tx, key: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
}

/** 새 버전: copies `fromId` into version max+1 as a DRAFT (one DRAFT per rule at a time). */
export async function newVisaRuleVersion(
  fromId: string,
  client: Client = db,
): Promise<RuleResult<{ id: string }>> {
  if (!validId(fromId)) return { ok: false, code: "NOT_FOUND" };
  try {
    return await client.$transaction(async (tx) => {
      const from = await tx.visaRule.findUnique({ where: { id: fromId } });
      if (!from) return { ok: false, code: "NOT_FOUND" } as const;
      await lock(tx, `visaRule:${from.ruleKey}`);
      const group = await tx.visaRule.findMany({
        where: { ruleKey: from.ruleKey },
        select: { version: true, status: true },
      });
      if (group.some((v) => v.status === "DRAFT"))
        return { ok: false, code: "DRAFT_EXISTS" } as const;
      const row = await tx.visaRule.create({
        data: {
          ruleKey: from.ruleKey,
          visaCode: from.visaCode,
          industryCode: from.industryCode,
          conditions: from.conditions as Prisma.InputJsonValue,
          outcome: from.outcome,
          messageKey: from.messageKey,
          version: Math.max(...group.map((v) => v.version)) + 1,
          status: "DRAFT",
          isSample: from.isSample || hasSampleMarker(from.conditions),
        },
        select: { id: true },
      });
      return { ok: true, id: row.id } as const;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, code: "DRAFT_EXISTS" };
    }
    throw e;
  }
}

/**
 * 게시: DRAFT → PUBLISHED with reviewedBy / reviewedAt; the rule's previous PUBLISHED version becomes
 * RETIRED in the same transaction. Writes RULE_PUBLISH (meta change PUBLISH, version, retiredIds).
 */
export async function publishVisaRule(
  args: { actorId: string; id: string; now?: Date },
  client: Client = db,
): Promise<RuleResult<{ retiredIds: string[] }>> {
  if (!validId(args.id)) return { ok: false, code: "NOT_FOUND" };
  const now = args.now ?? new Date();
  return client.$transaction(async (tx) => {
    const row = await tx.visaRule.findUnique({ where: { id: args.id } });
    if (!row) return { ok: false, code: "NOT_FOUND" } as const;
    await lock(tx, `visaRule:${row.ruleKey}`);
    if (row.status !== "DRAFT") return { ok: false, code: "NOT_DRAFT" } as const;
    if (row.isSample || hasSampleMarker(row.conditions)) {
      return { ok: false, code: "SAMPLE_NOT_PUBLISHABLE" } as const;
    }
    const checked = await checkRuleInput(
      {
        visaCode: row.visaCode,
        industryCode: row.industryCode,
        outcome: row.outcome,
        messageKey: row.messageKey,
        conditions: JSON.stringify(row.conditions),
      },
      tx,
    );
    if (!checked.ok) return checked;
    const previous = await tx.visaRule.findMany({
      where: { ruleKey: row.ruleKey, status: "PUBLISHED", id: { not: row.id } },
      select: { id: true },
    });
    const retiredIds = previous.map((p) => p.id);
    if (retiredIds.length > 0) {
      await tx.visaRule.updateMany({
        where: { id: { in: retiredIds }, status: "PUBLISHED" },
        data: { status: "RETIRED" },
      });
    }
    const r = await tx.visaRule.updateMany({
      where: { id: row.id, status: "DRAFT" },
      data: { status: "PUBLISHED", reviewedBy: args.actorId, reviewedAt: now },
    });
    if (r.count !== 1) throw new Error("publishVisaRule: draft changed during publish");
    await writeAudit(
      {
        actorId: args.actorId,
        action: "RULE_PUBLISH",
        entity: "VisaRule",
        entityId: row.id,
        meta: { change: "PUBLISH", version: row.version, retiredIds },
      },
      tx,
    );
    return { ok: true, retiredIds } as const;
  });
}

/** 폐기: PUBLISHED → RETIRED (the rule stops deciding results at once). Writes RULE_PUBLISH RETIRE. */
export async function retireVisaRule(
  args: { actorId: string; id: string },
  client: Client = db,
): Promise<RuleResult> {
  if (!validId(args.id)) return { ok: false, code: "NOT_FOUND" };
  return client.$transaction(async (tx) => {
    const row = await tx.visaRule.findUnique({
      where: { id: args.id },
      select: { id: true, ruleKey: true, version: true },
    });
    if (!row) return { ok: false, code: "NOT_FOUND" } as const;
    await lock(tx, `visaRule:${row.ruleKey}`);
    const r = await tx.visaRule.updateMany({
      where: { id: row.id, status: "PUBLISHED" },
      data: { status: "RETIRED" },
    });
    if (r.count !== 1) return { ok: false, code: "NOT_PUBLISHED" } as const;
    await writeAudit(
      {
        actorId: args.actorId,
        action: "RULE_PUBLISH",
        entity: "VisaRule",
        entityId: row.id,
        meta: { change: "RETIRE", version: row.version },
      },
      tx,
    );
    return { ok: true } as const;
  });
}

// ─── ScoreTable ───────────────────────────────────────────────────────────────────────────

const TABLE_LIST_SELECT = {
  id: true,
  name: true,
  version: true,
  passScore: true,
  status: true,
  isSample: true,
  reviewedBy: true,
  reviewedAt: true,
  createdAt: true,
} as const satisfies Prisma.ScoreTableSelect;

export function listScoreTables(client: Client = db) {
  return client.scoreTable.findMany({
    orderBy: [{ name: "asc" }, { version: "desc" }],
    take: ADMIN_RULE_LIST_MAX,
    select: TABLE_LIST_SELECT,
  });
}

export async function getScoreTable(id: string, client: Client = db) {
  if (!validId(id)) return null;
  const table = await client.scoreTable.findUnique({ where: { id } });
  if (!table) return null;
  const versions = await client.scoreTable.findMany({
    where: { name: table.name },
    orderBy: { version: "desc" },
    select: TABLE_LIST_SELECT,
  });
  return { table, versions };
}

function checkTableInput(
  input: Pick<ScoreTableDraftInput, "items" | "passScore">,
): RuleResult<{ items: Prisma.InputJsonObject; passScore: number | null; isSample: boolean }> {
  const items = parseScoreItems(input.items);
  if (!items.ok) return { ok: false, code: items.code };
  return {
    ok: true,
    items: items.value as Prisma.InputJsonObject,
    passScore: input.passScore,
    isSample: hasSampleMarker(items.value),
  };
}

/**
 * 새 점수표 (or the next version of an existing name): DRAFT at version max+1 of that name. A name
 * that already has a DRAFT is refused (DRAFT_EXISTS).
 */
export async function createScoreTable(
  input: ScoreTableDraftInput,
  client: Client = db,
): Promise<RuleResult<{ id: string }>> {
  const checked = checkTableInput(input);
  if (!checked.ok) return checked;
  try {
    return await client.$transaction(async (tx) => {
      await lock(tx, `scoreTable:${input.name}`);
      const group = await tx.scoreTable.findMany({
        where: { name: input.name },
        select: { version: true, status: true },
      });
      if (group.some((v) => v.status === "DRAFT"))
        return { ok: false, code: "DRAFT_EXISTS" } as const;
      const row = await tx.scoreTable.create({
        data: {
          name: input.name,
          version: group.length === 0 ? 1 : Math.max(...group.map((v) => v.version)) + 1,
          items: checked.items,
          passScore: checked.passScore,
          status: "DRAFT",
          isSample: checked.isSample,
        },
        select: { id: true },
      });
      return { ok: true, id: row.id } as const;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, code: "DRAFT_EXISTS" };
    }
    throw e;
  }
}

/** 새 버전 of a table: copies `fromId` (items, pass score) into a new DRAFT of the same name. */
export async function newScoreTableVersion(
  fromId: string,
  client: Client = db,
): Promise<RuleResult<{ id: string }>> {
  if (!validId(fromId)) return { ok: false, code: "NOT_FOUND" };
  const from = await client.scoreTable.findUnique({ where: { id: fromId } });
  if (!from) return { ok: false, code: "NOT_FOUND" };
  const r = await createScoreTable(
    {
      name: from.name,
      passScore: from.passScore,
      items: JSON.stringify(from.items),
    },
    client,
  );
  if (r.ok && from.isSample) {
    await client.scoreTable.update({ where: { id: r.id }, data: { isSample: true } });
  }
  return r;
}

export async function updateScoreTableDraft(
  id: string,
  input: Pick<ScoreTableDraftInput, "items" | "passScore">,
  client: Client = db,
): Promise<RuleResult> {
  if (!validId(id)) return { ok: false, code: "NOT_FOUND" };
  const checked = checkTableInput(input);
  if (!checked.ok) return checked;
  const r = await client.scoreTable.updateMany({
    where: { id, status: "DRAFT" },
    data: { items: checked.items, passScore: checked.passScore, isSample: checked.isSample },
  });
  if (r.count === 1) return { ok: true };
  return (await client.scoreTable.count({ where: { id } }))
    ? { ok: false, code: "NOT_DRAFT" }
    : { ok: false, code: "NOT_FOUND" };
}

export async function publishScoreTable(
  args: { actorId: string; id: string; now?: Date },
  client: Client = db,
): Promise<RuleResult<{ retiredIds: string[] }>> {
  if (!validId(args.id)) return { ok: false, code: "NOT_FOUND" };
  const now = args.now ?? new Date();
  return client.$transaction(async (tx) => {
    const row = await tx.scoreTable.findUnique({ where: { id: args.id } });
    if (!row) return { ok: false, code: "NOT_FOUND" } as const;
    await lock(tx, `scoreTable:${row.name}`);
    if (row.status !== "DRAFT") return { ok: false, code: "NOT_DRAFT" } as const;
    if (row.isSample || hasSampleMarker(row.items)) {
      return { ok: false, code: "SAMPLE_NOT_PUBLISHABLE" } as const;
    }
    const checked = checkTableInput({
      items: JSON.stringify(row.items),
      passScore: row.passScore,
    });
    if (!checked.ok) return checked;
    const previous = await tx.scoreTable.findMany({
      where: { name: row.name, status: "PUBLISHED", id: { not: row.id } },
      select: { id: true },
    });
    const retiredIds = previous.map((p) => p.id);
    if (retiredIds.length > 0) {
      await tx.scoreTable.updateMany({
        where: { id: { in: retiredIds }, status: "PUBLISHED" },
        data: { status: "RETIRED" },
      });
    }
    const r = await tx.scoreTable.updateMany({
      where: { id: row.id, status: "DRAFT" },
      data: { status: "PUBLISHED", reviewedBy: args.actorId, reviewedAt: now },
    });
    if (r.count !== 1) throw new Error("publishScoreTable: draft changed during publish");
    await writeAudit(
      {
        actorId: args.actorId,
        action: "RULE_PUBLISH",
        entity: "ScoreTable",
        entityId: row.id,
        meta: { change: "PUBLISH", version: row.version, retiredIds },
      },
      tx,
    );
    return { ok: true, retiredIds } as const;
  });
}

export async function retireScoreTable(
  args: { actorId: string; id: string },
  client: Client = db,
): Promise<RuleResult> {
  if (!validId(args.id)) return { ok: false, code: "NOT_FOUND" };
  return client.$transaction(async (tx) => {
    const row = await tx.scoreTable.findUnique({
      where: { id: args.id },
      select: { id: true, name: true, version: true },
    });
    if (!row) return { ok: false, code: "NOT_FOUND" } as const;
    await lock(tx, `scoreTable:${row.name}`);
    const r = await tx.scoreTable.updateMany({
      where: { id: row.id, status: "PUBLISHED" },
      data: { status: "RETIRED" },
    });
    if (r.count !== 1) return { ok: false, code: "NOT_PUBLISHED" } as const;
    await writeAudit(
      {
        actorId: args.actorId,
        action: "RULE_PUBLISH",
        entity: "ScoreTable",
        entityId: row.id,
        meta: { change: "RETIRE", version: row.version },
      },
      tx,
    );
    return { ok: true } as const;
  });
}

/** Display names of the staff who reviewed (published) versions (admin screens). */
export async function reviewerNames(
  ids: (string | null)[],
  client: Client = db,
): Promise<Map<string, string>> {
  const wanted = [...new Set(ids.filter((v): v is string => typeof v === "string"))];
  if (wanted.length === 0) return new Map();
  const users = await client.user.findMany({
    where: { id: { in: wanted } },
    select: { id: true, displayName: true },
  });
  return new Map(users.map((u) => [u.id, u.displayName ?? "직원"]));
}

export const RULE_STATUSES: readonly RuleStatus[] = ["DRAFT", "PUBLISHED", "RETIRED"];
