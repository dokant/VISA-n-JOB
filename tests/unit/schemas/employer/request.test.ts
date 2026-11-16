/**
 * R-125 / BR-14: "연락처 포함 입력 거부" — every free-text field of the 구인 의뢰서 refuses phone,
 * e-mail, URL and messenger ids with the code `contactInfo` (shown as the reason in the form).
 */
import { describe, expect, it } from "vitest";

import {
  JOB_REQUEST_GUARDED_FIELDS,
  JOB_REQUEST_STEPS,
  jobRequestSchema,
} from "@/schemas/employer/request";

const valid = {
  companyName: "테스트 제조",
  sido: "SEOUL",
  sigungu: "SEOUL_JUNG_GU",
  employeeCount: "12",
  contactName: "김담당",
  contactPhone: "010-1234-5678",
  contactEmail: "",
  role: "포장",
  payMin: "2500000",
  payMax: "",
  workHours: "09:00~18:00 주 5일",
  overtime: "NONE",
  headcount: "2",
  startTiming: "IMMEDIATE",
  dormitory: "NONE",
  meals: "PROVIDED",
  preferences: "",
  detail: "",
};

const CONTACTS = [
  "연락은 010-9876-5432로 주세요",
  "hr@example.com 으로 이력서",
  "https://example.com/apply",
  "카톡 아이디 hongjob",
  "Zalo: 0912 345 678",
  "@hong_recruit 으로 DM",
];

describe("R-125 jobRequestSchema", () => {
  it("accepts an ordinary request (amounts, times, head counts are not contacts)", () => {
    const r = jobRequestSchema.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.data).toMatchObject({ employeeCount: 12, payMin: 2_500_000, payMax: undefined });
  });

  it("R-125 BR-14: refuses contact patterns in every free-text field with code contactInfo", () => {
    for (const field of JOB_REQUEST_GUARDED_FIELDS) {
      for (const text of CONTACTS) {
        const r = jobRequestSchema.safeParse({ ...valid, [field]: text });
        expect(r.success, `${field}: ${text}`).toBe(false);
        expect(r.error?.issues.map((i) => [i.path[0], i.message])).toContainEqual([
          field,
          "contactInfo",
        ]);
      }
    }
  });

  it("the contact person's own phone field is a phone (not a free-text field)", () => {
    expect(jobRequestSchema.safeParse({ ...valid, contactPhone: "02-123-4567" }).success).toBe(
      true,
    );
    const bad = jobRequestSchema.safeParse({ ...valid, contactPhone: "hello" });
    expect(bad.error?.issues[0]).toMatchObject({ path: ["contactPhone"], message: "invalidPhone" });
  });

  it("required fields, numbers and pay range", () => {
    const r = jobRequestSchema.safeParse({ ...valid, role: "", headcount: "" });
    const codes = Object.fromEntries(r.error?.issues.map((i) => [i.path[0], i.message]) ?? []);
    expect(codes).toMatchObject({ role: "required", headcount: "required" });
    const pay = jobRequestSchema.safeParse({ ...valid, payMax: "1000" });
    expect(pay.error?.issues[0]).toMatchObject({ path: ["payMax"], message: "payRange" });
    expect(jobRequestSchema.safeParse({ ...valid, headcount: "2.5" }).success).toBe(false);
    expect(jobRequestSchema.safeParse({ ...valid, overtime: "" }).success).toBe(false);
    expect(jobRequestSchema.safeParse({ ...valid, contactEmail: "nope" }).success).toBe(false);
  });

  it("each form screen holds at most 7 questions (STANDARD 3.3)", () => {
    // sido + sigungu and payMin + payMax are one question each
    const questions = (fields: readonly string[]) =>
      fields.filter((f) => f !== "sigungu" && f !== "payMax").length;
    for (const fields of Object.values(JOB_REQUEST_STEPS)) {
      expect(questions(fields)).toBeLessThanOrEqual(7);
    }
    const all = Object.values(JOB_REQUEST_STEPS).flat().sort();
    expect(all).toEqual(Object.keys(valid).sort());
  });
});
