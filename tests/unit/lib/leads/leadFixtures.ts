/** Shared helpers for the P1d lead tests (unique sourceRefs; the test DB is never cleaned). */
import type { IngestJobLeadInput } from "@/schemas/ingest/jobLead";

import { uniq } from "../../db/helpers";

const DAY_MS = 86_400_000;

/** One valid collector item. Region / industry as published text ("충청남도" style names). */
export function leadItem(
  over: Partial<IngestJobLeadInput> & Record<string, unknown> = {},
  now: Date = new Date(),
): IngestJobLeadInput & Record<string, unknown> {
  return {
    source: "WORK24_API",
    sourceRef: uniq("w24"),
    companyName: "테스트 제조 주식회사",
    industryName: "제조업",
    sido: "충청남도",
    sigungu: "천안시",
    title: "생산직 사원 모집",
    payMin: 2_500_000,
    payMax: 3_000_000,
    postedAt: new Date(now.getTime() - DAY_MS).toISOString(),
    closesAt: new Date(now.getTime() + 20 * DAY_MS).toISOString(),
    ...over,
  };
}

export function batch(n: number, now: Date = new Date()) {
  return Array.from({ length: n }, () => leadItem({}, now));
}
