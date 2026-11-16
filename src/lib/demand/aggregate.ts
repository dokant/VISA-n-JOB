/**
 * Demand map aggregate (R-117, WO §8.4, BR-04).
 *
 * - Source: job leads of grade C·B·A dated within the last DEMAND_WINDOW_DAYS days
 *   (postedAt, or createdAt when postedAt is missing). Leads are never listed individually.
 * - Grouped by 시·도 × 업종 (KSIC section). Leads without an industry form their own cell.
 * - A cell with fewer than DEMAND_MIN_SAMPLE leads is masked ("자료 부족"): neither its count nor its
 *   pay is returned (WO §15-10). The pay median is shown as a band only, and only when at least
 *   DEMAND_MIN_SAMPLE leads in the cell carry pay information.
 * - Per-시·도 totals add up only the cells that are shown, so a masked cell can never be recovered
 *   by subtracting visible numbers from a total.
 */
import type { LeadGrade } from "@prisma/client";

import {
  DEMAND_LEAD_GRADES,
  DEMAND_MIN_SAMPLE,
  DEMAND_PAY_BAND_STEP_KRW,
  DEMAND_WINDOW_DAYS,
} from "@/config/limits";
import { db } from "@/lib/db";

const DAY_MS = 86_400_000; // one day

export type DemandLead = {
  sido: string;
  industryCode: string | null;
  payMin: number | null;
  payMax: number | null;
  grade: LeadGrade;
  postedAt: Date | null;
  createdAt: Date;
};

export type PayBand = { min: number; max: number };

export type DemandCell = {
  sido: string;
  industryCode: string | null;
  masked: boolean;
  /** null when masked. */
  count: number | null;
  /** null when masked or when too few leads carry pay. */
  payBand: PayBand | null;
};

export type DemandSido = {
  sido: string;
  masked: boolean;
  /** Sum of the visible cells of this 시·도; null when that sum is below the minimum sample. */
  count: number | null;
  /** Pay median band over the leads of the visible cells (same minimum sample rule). */
  payBand: PayBand | null;
};

export type DemandAggregate = {
  windowDays: number;
  minSample: number;
  since: Date;
  until: Date;
  cells: DemandCell[];
  bySido: DemandSido[];
};

export type DemandOptions = {
  windowDays?: number;
  minSample?: number;
  payBandStep?: number;
};

function leadPay(lead: DemandLead): number | null {
  if (lead.payMin !== null && lead.payMax !== null) return (lead.payMin + lead.payMax) / 2;
  return lead.payMin ?? lead.payMax ?? null;
}

export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function payBandOf(value: number, step: number): PayBand {
  const min = Math.floor(value / step) * step;
  return { min, max: min + step };
}

/** Pure aggregation. `sidoCodes` lists every 시·도 to report (so empty ones show "자료 부족"). */
export function aggregateDemand(
  leads: readonly DemandLead[],
  now: Date,
  sidoCodes: readonly string[] = [],
  options: DemandOptions = {},
): DemandAggregate {
  const windowDays = options.windowDays ?? DEMAND_WINDOW_DAYS;
  const minSample = options.minSample ?? DEMAND_MIN_SAMPLE;
  const step = options.payBandStep ?? DEMAND_PAY_BAND_STEP_KRW;
  const since = new Date(now.getTime() - windowDays * DAY_MS);
  const grades = new Set<string>(DEMAND_LEAD_GRADES);

  const groups = new Map<string, DemandLead[]>();
  for (const lead of leads) {
    if (!grades.has(lead.grade)) continue;
    const at = lead.postedAt ?? lead.createdAt;
    if (at < since || at > now) continue;
    const key = `${lead.sido}\u0000${lead.industryCode ?? ""}`;
    const list = groups.get(key);
    if (list) list.push(lead);
    else groups.set(key, [lead]);
  }

  const visiblePays = new Map<string, number[]>();
  const cells: DemandCell[] = [...groups.values()].map((group) => {
    const { sido, industryCode } = group[0];
    if (group.length < minSample) {
      return { sido, industryCode, masked: true, count: null, payBand: null };
    }
    const pays = group.map(leadPay).filter((p): p is number => p !== null);
    visiblePays.set(sido, [...(visiblePays.get(sido) ?? []), ...pays]);
    return {
      sido,
      industryCode,
      masked: false,
      count: group.length,
      payBand: pays.length >= minSample ? payBandOf(median(pays), step) : null,
    };
  });
  // 시·도, then industry code; cells without an industry come last.
  cells.sort((a, b) => {
    if (a.sido !== b.sido) return a.sido < b.sido ? -1 : 1;
    if (a.industryCode === b.industryCode) return 0;
    if (a.industryCode === null) return 1;
    if (b.industryCode === null) return -1;
    return a.industryCode < b.industryCode ? -1 : 1;
  });

  const visibleBySido = new Map<string, number>();
  for (const cell of cells) {
    if (cell.masked || cell.count === null) continue;
    visibleBySido.set(cell.sido, (visibleBySido.get(cell.sido) ?? 0) + cell.count);
  }
  const sidoList = [...new Set([...sidoCodes, ...cells.map((c) => c.sido)])];
  const bySido: DemandSido[] = sidoList.map((sido) => {
    const total = visibleBySido.get(sido) ?? 0;
    if (total < minSample) return { sido, masked: true, count: null, payBand: null };
    const pays = visiblePays.get(sido) ?? [];
    return {
      sido,
      masked: false,
      count: total,
      payBand: pays.length >= minSample ? payBandOf(median(pays), step) : null,
    };
  });

  return { windowDays, minSample, since, until: now, cells, bySido };
}

/** Reads the leads of the window from the database and aggregates them. */
export async function getDemandAggregate(
  now: Date = new Date(),
  sidoCodes: readonly string[] = [],
  client = db,
): Promise<DemandAggregate> {
  const since = new Date(now.getTime() - DEMAND_WINDOW_DAYS * DAY_MS);
  const leads = await client.jobLead.findMany({
    where: {
      grade: { in: [...DEMAND_LEAD_GRADES] },
      OR: [{ postedAt: { gte: since, lte: now } }, { postedAt: null, createdAt: { gte: since } }],
    },
    select: {
      sido: true,
      industryCode: true,
      payMin: true,
      payMax: true,
      grade: true,
      postedAt: true,
      createdAt: true,
    },
  });
  return aggregateDemand(leads, now, sidoCodes);
}
