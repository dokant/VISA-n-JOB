/**
 * R-108 트랙 분류 — every row of WO §7.4, using the seeded VisaType rows (the mapping is data).
 * R-109 / BR-08 등록 불가 rows are covered here at the engine level (WO15-05, WO15-06).
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  type TrackResult,
  classifyTrack,
  classifyVisa,
  isStayExpired,
  loadVisaTypeForTrack,
} from "@/lib/visa-engine/classifyTrack";

const NOW = new Date("2026-11-16T03:00:00.000Z");
const month = (y: number, m: number) => new Date(Date.UTC(y, m - 1, 1));
const FUTURE_EXPIRY = month(2028, 1);

async function classify(
  visaCode: string,
  extra: { graduationDate?: Date; stayExpiry?: Date } = {},
) {
  return classifyVisa({ visaCode, now: NOW, stayExpiry: FUTURE_EXPIRY, ...extra });
}

const ok = (track: string, autoConsult = false, needsVisaReview = false): TrackResult =>
  ({ registrable: true, track, autoConsult, needsVisaReview }) as TrackResult;

describe("R-108 WO §7.4 track table (VisaType data)", () => {
  it.each(["F-2", "F-4", "F-5", "F-6", "H-2"])("R-108: %s → JOB_MATCH", async (code) => {
    expect(await classify(code)).toEqual(ok("JOB_MATCH"));
  });

  it("R-108: D-10 → JOB_MATCH + 상담 자동 생성", async () => {
    expect(await classify("D-10")).toEqual(ok("JOB_MATCH", true));
  });

  it("R-108: D-2 graduating within 6 months → JOB_MATCH + 상담 자동 생성", async () => {
    for (const grad of [month(2026, 11), month(2027, 2), month(2027, 5)]) {
      expect(await classify("D-2", { graduationDate: grad })).toEqual(ok("JOB_MATCH", true));
    }
  });

  it("R-108: D-2 otherwise (later, already graduated, unknown) and D-4 → CONSULT_ONLY", async () => {
    expect(await classify("D-2", { graduationDate: month(2027, 6) })).toEqual(ok("CONSULT_ONLY"));
    expect(await classify("D-2", { graduationDate: month(2026, 10) })).toEqual(ok("CONSULT_ONLY"));
    expect(await classify("D-2")).toEqual(ok("CONSULT_ONLY"));
    expect(await classify("D-4")).toEqual(ok("CONSULT_ONLY"));
  });

  it("R-108: E-7 계열 → JOB_MATCH + needsVisaReview", async () => {
    expect(await classify("E-7")).toEqual(ok("JOB_MATCH", false, true));
  });

  it.each(["E-9", "E-10"])("R-108 WO15-06: %s → FUTURE_POOL (BR-07)", async (code) => {
    expect(await classify(code)).toEqual(ok("FUTURE_POOL"));
  });

  it.each(["C-4", "G-1"])("R-108: %s → CONSULT_ONLY", async (code) => {
    expect(await classify(code)).toEqual(ok("CONSULT_ONLY"));
  });

  it("R-108 SC-02: 기타 (OTHER) and 모름 (UNKNOWN) cannot complete registration", async () => {
    for (const code of ["OTHER", "UNKNOWN"]) {
      expect(await classify(code)).toEqual({ registrable: false, reason: "VISA_NOT_REGISTRABLE" });
    }
  });

  it.each(["B-1", "B-2", "C-3", "NONE"])("R-109 WO15-05: %s → 등록 불가 (BR-08)", async (code) => {
    expect(await classify(code)).toEqual({
      registrable: false,
      reason: "VISA_NOT_REGISTRABLE",
    });
  });

  it("R-109 WO15-05: 만료 (expiry month already over) → 등록 불가, this month is still valid", async () => {
    expect(await classify("F-4", { stayExpiry: month(2026, 10) })).toEqual({
      registrable: false,
      reason: "STAY_EXPIRED",
    });
    expect(await classify("F-4", { stayExpiry: month(2026, 11) })).toEqual(ok("JOB_MATCH"));
    expect(isStayExpired(month(2026, 10), NOW)).toBe(true);
    expect(isStayExpired(month(2026, 11), NOW)).toBe(false);
  });

  it("R-109: 없음 — no visa or an unknown code → 등록 불가", async () => {
    expect(await classifyVisa({ visaCode: null, now: NOW })).toEqual({
      registrable: false,
      reason: "NO_VISA",
    });
    expect(await classifyVisa({ visaCode: "Z-99", now: NOW })).toEqual({
      registrable: false,
      reason: "NO_VISA",
    });
  });
});

describe("R-108 classification follows the data, not code", () => {
  it("an edited VisaType row changes the result (admin-editable mapping)", async () => {
    const row = await loadVisaTypeForTrack("E-9");
    if (!row) throw new Error("seed missing");
    expect(classifyTrack({ visaType: row, now: NOW })).toEqual(ok("FUTURE_POOL"));
    expect(classifyTrack({ visaType: { ...row, defaultTrack: "JOB_MATCH" }, now: NOW })).toEqual(
      ok("JOB_MATCH"),
    );
    expect(classifyTrack({ visaType: { ...row, registrable: false }, now: NOW })).toEqual({
      registrable: false,
      reason: "VISA_NOT_REGISTRABLE",
    });
    // registrable decides, never defaultTrack = null (STANDARD 4.9)
    expect(classifyTrack({ visaType: { ...row, defaultTrack: null }, now: NOW })).toEqual(
      ok("CONSULT_ONLY"),
    );
  });

  it("R-108: classifyTrack.ts holds no visa code literal and no mapping constant", () => {
    const src = readFileSync(
      path.join(process.cwd(), "src/lib/visa-engine/classifyTrack.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/['"`][A-H]-[0-9]{1,2}(-[0-9A-Z]{1,2})?['"`]/);
    expect(src).not.toMatch(/(Record<|Map<|switch\s*\().*visa/i);
    expect(src).not.toMatch(/\b(JOB_MATCH|FUTURE_POOL)\b/);
  });
});
