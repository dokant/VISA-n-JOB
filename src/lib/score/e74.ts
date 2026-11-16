/**
 * E-7-4 score calculator (R-127, WO §10, BR-11, BR-12).
 *
 * - Uses only the latest PUBLISHED ScoreTable for E-7-4. No published table → `NOT_READY`
 *   (the page shows "준비 중" + 상담 신청).
 * - Every point value, band and pass score comes from the table JSON entered by the 행정사.
 *   This module holds no criteria or numbers of its own.
 * - The result has the total, per-item points, items below their maximum ("부족 항목") and the
 *   reference disclaimer key (always rendered by ScoreResult).
 */
import type { RuleStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { REFERENCE_DISCLAIMER_KEY } from "@/lib/visa-engine/constants";
import {
  type LocalizedText,
  type ScoreAnswers,
  type ScoreItem,
  scoreTableItemsSchema,
} from "@/schemas/score/scoreTable";

/**
 * Route slug of the calculator. A ScoreTable belongs to it when its `name` reduces to this slug
 * (letters and digits only, lower case), so the table name typed by the operator is the key.
 */
export const E74_SLUG = "e74";

export type ScoreTableRecord = {
  id: string;
  name: string;
  version: number;
  items: unknown;
  passScore: number | null;
  status: RuleStatus;
};

export type ParsedScoreTable = {
  id: string;
  version: number;
  passScore: number | null;
  items: ScoreItem[];
};

export type ScoreItemResult = {
  key: string;
  label: LocalizedText;
  bandKey: string | null;
  bandLabel: LocalizedText | null;
  points: number;
  maxPoints: number;
};

export type E74Ready = {
  status: "READY";
  tableId: string;
  version: number;
  total: number;
  maxTotal: number;
  passScore: number | null;
  /** null when the table has no pass score. */
  passed: boolean | null;
  items: ScoreItemResult[];
  /** Items scoring below their maximum band, largest gap first. */
  shortfalls: Array<ScoreItemResult & { gap: number }>;
  disclaimerKey: typeof REFERENCE_DISCLAIMER_KEY;
};

export type E74NotReady = { status: "NOT_READY" };
export type E74Result = E74Ready | E74NotReady;

export function normalizeTableName(name: string): string {
  return name.replace(/[^0-9a-z]/gi, "").toLowerCase();
}

/** Picks a localized label: exact locale, then ko, then the first value. */
export function localize(text: LocalizedText, locale: string): string {
  if (typeof text === "string") return text;
  return text[locale] ?? text.ko ?? Object.values(text)[0] ?? "";
}

/** Returns the parsed table when it is a PUBLISHED E-7-4 table with valid JSON, else null. */
export function parseScoreTable(record: ScoreTableRecord): ParsedScoreTable | null {
  if (record.status !== "PUBLISHED") return null;
  if (normalizeTableName(record.name) !== E74_SLUG) return null;
  const parsed = scoreTableItemsSchema.safeParse(record.items);
  if (!parsed.success) return null;
  return {
    id: record.id,
    version: record.version,
    passScore: record.passScore,
    items: parsed.data.items,
  };
}

/** Pure calculation. Unknown or missing answers score 0 for that item. */
export function calculateE74(table: ParsedScoreTable, answers: ScoreAnswers): E74Ready {
  const items: ScoreItemResult[] = table.items.map((item) => {
    const maxPoints = Math.max(...item.bands.map((b) => b.points));
    const band = item.bands.find((b) => b.key === answers[item.key]) ?? null;
    return {
      key: item.key,
      label: item.label,
      bandKey: band?.key ?? null,
      bandLabel: band?.label ?? null,
      points: band?.points ?? 0,
      maxPoints,
    };
  });
  const total = items.reduce((sum, i) => sum + i.points, 0);
  const maxTotal = items.reduce((sum, i) => sum + i.maxPoints, 0);
  const shortfalls = items
    .filter((i) => i.points < i.maxPoints)
    .map((i) => ({ ...i, gap: i.maxPoints - i.points }))
    .sort((a, b) => b.gap - a.gap);

  return {
    status: "READY",
    tableId: table.id,
    version: table.version,
    total,
    maxTotal,
    passScore: table.passScore,
    passed: table.passScore === null ? null : total >= table.passScore,
    items,
    shortfalls,
    disclaimerKey: REFERENCE_DISCLAIMER_KEY,
  };
}

type TableReader = {
  scoreTable: {
    findMany(args: {
      where: { status: RuleStatus };
      orderBy: { version: "desc" };
    }): Promise<ScoreTableRecord[]>;
  };
};

/** Latest PUBLISHED E-7-4 table, or null (→ "준비 중"). */
export async function getPublishedE74Table(
  client: TableReader = db,
): Promise<ParsedScoreTable | null> {
  const rows = await client.scoreTable.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { version: "desc" },
  });
  for (const row of rows) {
    const parsed = parseScoreTable(row);
    if (parsed) return parsed;
  }
  return null;
}

export async function scoreE74(answers: ScoreAnswers, client?: TableReader): Promise<E74Result> {
  const table = await getPublishedE74Table(client);
  if (!table) return { status: "NOT_READY" };
  return calculateE74(table, answers);
}
