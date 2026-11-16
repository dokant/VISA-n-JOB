/**
 * P1e E-1 / E-5 (STANDARD 3.5·3.6, S-32): 관리자 원화 포맷은 `Intl` KRW, 구인 의뢰 내용은 한국어 라벨만.
 */
import { describe, expect, it } from "vitest";

import { REQUEST_OTHER_LABEL, fmtWon, requestRows } from "@/app/admin/_i18n/ko";

describe("admin ko formatters", () => {
  it("E-1: fmtWon uses Intl currency KRW", () => {
    const expected = new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0,
    }).format(2_500_000);
    expect(fmtWon(2_500_000)).toBe(expected);
    expect(fmtWon(null)).toBe("—");
  });

  it("E-5: requestRows shows Korean labels and option words, never raw keys, codes or JSON", () => {
    const rows = requestRows({
      role: "용접",
      payMin: 2_500_000,
      payMax: null,
      workHours: "08:30~17:30",
      overtime: "UNKNOWN",
      headcount: 3,
      startTiming: "WITHIN_1M",
      dormitory: "ALLOWANCE",
      meals: "PARTIAL",
      preferences: "",
      detail: "교대 근무",
      employeeCount: 40,
      extraField: { nested: "값" },
      flags: ["가", "나"],
    });
    const text = JSON.stringify(rows);
    for (const raw of [
      "overtime",
      "UNKNOWN",
      "WITHIN_1M",
      "ALLOWANCE",
      "PARTIAL",
      "extraField",
      '{\\"nested',
    ]) {
      expect(text).not.toContain(raw);
    }
    expect(rows).toContainEqual({ label: "잔업", value: "모름" });
    expect(rows).toContainEqual({ label: "채용 시기", value: "1개월 안" });
    expect(rows).toContainEqual({ label: "숙소", value: "주거비 도움" });
    expect(rows).toContainEqual({ label: "월 급여 최저(세전)", value: fmtWon(2_500_000) });
    expect(rows.find((r) => r.label === "월 급여 최고(세전)")).toBeUndefined();
    expect(rows.find((r) => r.label === "희망 조건")).toBeUndefined();
    expect(rows.at(-1)).toEqual({ label: REQUEST_OTHER_LABEL, value: "가, 나" });
    expect(requestRows(null)).toEqual([]);
    expect(requestRows(["x"])).toEqual([]);
  });
});
