import { getFormatter, getTranslations } from "next-intl/server";

import { type DemandAggregate, type PayBand, getDemandAggregate } from "@/lib/demand/aggregate";
import { getIndustries, getSidoRegions } from "@/lib/referenceData";

import type { DemandMapNode } from "./demand-map";

export type DemandRow = {
  key: string;
  sido: string;
  industry: string;
  countText: string;
  payText: string;
  masked: boolean;
};

export type DemandView = {
  aggregate: DemandAggregate;
  nodes: DemandMapNode[];
  rows: DemandRow[];
  sidoOptions: Array<{ code: string; label: string }>;
  industryOptions: Array<{ code: string; label: string }>;
};

/** Loads the aggregate and turns it into localized display rows (server only). */
export async function loadDemandView(): Promise<DemandView> {
  const t = await getTranslations();
  const format = await getFormatter();
  const [sidos, industries] = await Promise.all([getSidoRegions(), getIndustries()]);
  const aggregate = await getDemandAggregate(
    new Date(),
    sidos.map((s) => s.code),
  );

  const sidoLabel = new Map(sidos.map((s) => [s.code, t(s.nameKey)]));
  const industryLabel = new Map(industries.map((i) => [i.code, t(i.nameKey)]));
  const insufficient = t("public.demand.table.insufficient");
  const money = (n: number) =>
    format.number(n, { style: "currency", currency: "KRW", maximumFractionDigits: 0 });
  const payText = (band: PayBand | null, masked: boolean) =>
    masked
      ? insufficient
      : band
        ? t("public.demand.table.payBand", { min: money(band.min), max: money(band.max) })
        : t("public.demand.table.noPay");
  const countText = (count: number | null) =>
    count === null ? insufficient : t("public.demand.table.countValue", { count });

  const nodes: DemandMapNode[] = aggregate.bySido.map((s) => ({
    code: s.sido,
    label: sidoLabel.get(s.sido) ?? s.sido,
    countText: countText(s.count),
    payText: payText(s.payBand, s.masked),
    hasData: !s.masked,
  }));

  const rows: DemandRow[] = aggregate.cells.map((c) => ({
    key: `${c.sido}-${c.industryCode ?? "none"}`,
    sido: sidoLabel.get(c.sido) ?? c.sido,
    industry: c.industryCode
      ? (industryLabel.get(c.industryCode) ?? c.industryCode)
      : t("common.industryUnknown"),
    countText: countText(c.count),
    payText: payText(c.payBand, c.masked),
    masked: c.masked,
  }));

  return {
    aggregate,
    nodes,
    rows,
    sidoOptions: sidos.map((s) => ({ code: s.code, label: sidoLabel.get(s.code) ?? s.code })),
    industryOptions: industries.map((i) => ({
      code: i.code,
      label: industryLabel.get(i.code) ?? i.code,
    })),
  };
}
