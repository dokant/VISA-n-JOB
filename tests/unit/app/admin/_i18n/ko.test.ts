/**
 * P1e E-1 / E-5 (STANDARD 3.5·3.6, S-32): 관리자 원화 포맷은 `Intl` KRW, 구인 의뢰 내용은 한국어 라벨만.
 * R-118 관리자 화면 한국어 전용, R-121 리드 상세(급여·구인 의뢰) 표시. QA O-4: 객체 값은 개수 요약.
 */
import { describe, expect, it } from "vitest";

import { REQUEST_OTHER_LABEL, fmtWon, requestRows } from "@/app/admin/_i18n/ko";

describe("admin ko formatters", () => {
  it("R-121 / E-1: fmtWon uses Intl currency KRW", () => {
    const expected = new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0,
    }).format(2_500_000);
    expect(fmtWon(2_500_000)).toBe(expected);
    expect(fmtWon(null)).toBe("—");
  });

  it("R-118 / R-121 / E-5: requestRows shows Korean labels and option words, never raw keys, codes or JSON", () => {
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
      "nested",
      "값",
    ]) {
      expect(text).not.toContain(raw);
    }
    expect(rows).toContainEqual({ label: "잔업", value: "모름" });
    expect(rows).toContainEqual({ label: "채용 시기", value: "1개월 안" });
    expect(rows).toContainEqual({ label: "숙소", value: "주거비 도움" });
    expect(rows).toContainEqual({ label: "월 급여 최저(세전)", value: fmtWon(2_500_000) });
    expect(rows.find((r) => r.label === "월 급여 최고(세전)")).toBeUndefined();
    expect(rows.find((r) => r.label === "희망 조건")).toBeUndefined();
    expect(rows.at(-1)).toEqual({ label: REQUEST_OTHER_LABEL, value: "(세부 항목 1개) · 가, 나" });
    expect(requestRows(null)).toEqual([]);
    expect(requestRows(["x"])).toEqual([]);
  });

  it("R-118 / R-121 / QA O-4: object values under 기타 항목 are summarised by count, empty objects dropped", () => {
    const rows = requestRows({
      extraA: { b: 1, c: "x", d: null },
      extraB: {},
      extraC: [{ e: 1 }, "가"],
      extraD: true,
    });
    expect(rows).toEqual([
      {
        label: REQUEST_OTHER_LABEL,
        value: "(세부 항목 2개) · (세부 항목 1개), 가 · 예",
      },
    ]);
    const text = rows.map((r) => `${r.label} ${r.value}`).join(" ");
    for (const raw of ["extra", "{", "}", "[", "]", '"']) expect(text).not.toContain(raw);
  });
});
