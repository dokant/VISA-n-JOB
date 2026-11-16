import { getFormatter, getTranslations } from "next-intl/server";

import { db } from "@/lib/db";
import { getIndustries, getSidoRegions } from "@/lib/referenceData";
import type { PublicPosting } from "@/lib/serializers/publicPosting";

export type PostingVisa = { code: string; nameKey: string; isStatusCode: boolean };

export type PostingFact = { key: string; label: string; value: string };

/** Localized display values of one public posting (server only; input is a PublicPosting). */
export type PostingView = {
  id: string;
  title: string;
  role: string;
  region: string;
  industry: string;
  payText: string;
  headcountText: string;
  facts: PostingFact[];
  visas: PostingVisa[];
  placementRegNo: string | null;
};

/**
 * Turns serialized postings into display rows: region / industry names from the reference tables
 * (nameKey → messages), visa labels from VisaType (no visa list in code, BR-12), money with `Intl`
 * (KRW) and coded fields through `public.jobs.*` messages.
 */
export async function loadPostingViews(postings: readonly PublicPosting[]): Promise<PostingView[]> {
  if (postings.length === 0) return [];
  const t = await getTranslations();
  const format = await getFormatter();
  const sigunguCodes = [...new Set(postings.map((p) => p.sigungu).filter((c): c is string => !!c))];
  const visaCodes = [...new Set(postings.flatMap((p) => p.eligibleVisas))];
  const [sidos, industries, sigungus, visaRows] = await Promise.all([
    getSidoRegions(),
    getIndustries(),
    sigunguCodes.length > 0
      ? db.region.findMany({
          where: { code: { in: sigunguCodes } },
          select: { code: true, nameKo: true },
        })
      : Promise.resolve([]),
    db.visaType.findMany({
      where: { code: { in: visaCodes } },
      orderBy: { sortOrder: "asc" },
      select: { code: true, nameKey: true, isStatusCode: true },
    }),
  ]);
  const sidoName = new Map(sidos.map((s) => [s.code, t(s.nameKey)]));
  const industryName = new Map(industries.map((i) => [i.code, t(i.nameKey)]));
  const sigunguName = new Map(sigungus.map((s) => [s.code, s.nameKo]));

  const money = (n: number) =>
    format.number(n, { style: "currency", currency: "KRW", maximumFractionDigits: 0 });
  const unset = t("public.jobs.notSpecified");
  const coded = (group: string, value: string | null) =>
    value ? t(`public.jobs.${group}.option.${value}`) : unset;

  return postings.map((p) => {
    const sido = sidoName.get(p.sido) ?? p.sido;
    const region = p.sigungu ? `${sido} ${sigunguName.get(p.sigungu) ?? ""}`.trim() : sido;
    const industry = industryName.get(p.industryCode) ?? t("common.industryUnknown");
    const payText =
      p.payMax != null && p.payMax !== p.payMin
        ? t("public.jobs.pay.range", { min: money(p.payMin), max: money(p.payMax) })
        : t("public.jobs.pay.from", { min: money(p.payMin) });
    const headcountText = t("public.jobs.headcount", { count: p.headcount });
    const visas = visaRows.filter((v) => p.eligibleVisas.includes(v.code)); // operator order
    const facts: PostingFact[] = [
      { key: "region", label: t("public.jobs.facts.region"), value: region },
      { key: "industry", label: t("public.jobs.facts.industry"), value: industry },
      { key: "role", label: t("public.jobs.facts.role"), value: p.role },
      { key: "pay", label: t("public.jobs.facts.pay"), value: payText },
      {
        key: "overtime",
        label: t("public.jobs.facts.overtime"),
        value: coded("overtime", p.overtimeNote),
      },
      {
        key: "dormitory",
        label: t("public.jobs.facts.dormitory"),
        value: coded("dormitory", p.dormitory),
      },
      { key: "meals", label: t("public.jobs.facts.meals"), value: coded("meals", p.meals) },
      { key: "shift", label: t("public.jobs.facts.shift"), value: coded("shift", p.shift) },
      { key: "headcount", label: t("public.jobs.facts.headcount"), value: headcountText },
    ];
    return {
      id: p.id,
      title: p.blindTitle,
      role: p.role,
      region,
      industry,
      payText,
      headcountText,
      facts,
      visas,
      placementRegNo: p.placementRegNo,
    };
  });
}
