/**
 * Q-26 / STANDARD 3.5 v2.19: ko times are on the 24-hour clock ("18:58"), built from numeric parts —
 * never "PM 6:58" / "오후 6:58" — whatever the runtime ICU data. Other locales keep their default.
 */
import { describe, expect, it } from "vitest";

import { fmtDate, fmtDateTime, fmtMonth } from "@/app/admin/_i18n/ko";
import {
  formatDate,
  formatDateTime,
  formatMonth,
  formatMonthName,
  formatTime,
  uses24HourClock,
} from "@/i18n/dateTime";

// 2026-11-22 09:58 UTC = 18:58 KST; 2026-01-05 15:07 UTC = 00:07 KST on 01-06.
const EVENING = new Date("2026-11-22T09:58:00Z");
const MIDNIGHT = new Date("2026-01-05T15:07:00Z");
const NOON = new Date("2026-03-03T03:00:00Z");

describe("Q-26 date / time formatting", () => {
  it("ko time is HH:mm on a 23-hour clock in Korea time", () => {
    expect(uses24HourClock("ko")).toBe(true);
    expect(formatTime("ko", EVENING)).toBe("18:58");
    expect(formatTime("ko", MIDNIGHT)).toBe("00:07");
    expect(formatTime("ko", NOON)).toBe("12:00");
  });

  it("ko date + time has no day period", () => {
    for (const d of [EVENING, MIDNIGHT, NOON]) {
      const text = formatDateTime("ko", d);
      expect(text).not.toMatch(/PM|AM|오전|오후/);
      expect(text).toMatch(/^\d{4}\. \d{1,2}\. \d{1,2}\. \d{2}:\d{2}$/);
    }
    expect(formatDateTime("ko", EVENING)).toBe("2026. 11. 22. 18:58");
    expect(formatDateTime("ko", MIDNIGHT)).toBe("2026. 1. 6. 00:07");
  });

  it("admin formatters use the same rule (2-digit date fields, 24-hour time)", () => {
    expect(fmtDateTime(EVENING)).toBe("2026. 11. 22. 18:58");
    expect(fmtDateTime(MIDNIGHT)).toBe("2026. 01. 06. 00:07");
    expect(fmtDate(MIDNIGHT)).toBe("2026. 01. 06.");
    expect(fmtMonth(new Date("2027-03-01T00:00:00Z"))).toMatch(/^2027. 0?3.$/);
    expect(fmtDateTime(null)).toBe("—");
  });

  it("other locales keep their own clock (en shows PM)", () => {
    expect(uses24HourClock("en")).toBe(false);
    expect(formatDateTime("en", EVENING)).toMatch(/6:58\s?PM/);
    expect(formatTime("en", EVENING)).toMatch(/6:58\s?PM/);
  });

  it("date-only, month and month-name helpers", () => {
    expect(formatDate("ko", EVENING)).toBe("2026. 11. 22.");
    expect(formatDate("ko", new Date("2026-11-22T00:00:00Z"), { timeZone: "UTC" })).toBe(
      "2026. 11. 22.",
    );
    expect(formatMonth("en", new Date("2027-03-01T00:00:00Z"))).toBe("March 2027");
    expect(formatMonthName("en", 0)).toBe("January");
  });
});
