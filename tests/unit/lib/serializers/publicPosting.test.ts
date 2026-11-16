/**
 * R-202 / BR-03 / STANDARD 4.4: the public posting serializer emits exactly the WO §8.5 keys
 * (BLIND_JOB_FIELDS) and never a company name, address, contact person, contact or business number.
 */
import { describe, expect, it } from "vitest";

import {
  BLIND_JOB_FIELDS,
  PUBLIC_POSTING_SELECT,
  type PublicPostingRow,
  serializePublicPosting,
} from "@/lib/serializers/publicPosting";

const FORBIDDEN_KEYS = [
  "companyId",
  "company",
  "companyName",
  "nameEnc",
  "address",
  "contactName",
  "contactPhone",
  "contactEmail",
  "contactNameEnc",
  "contactPhoneEnc",
  "contactEmailEnc",
  "bizRegNo",
  "bizRegNoEnc",
  "leadId",
  "lead",
  "verifiedBy",
  "title",
  "rawJson",
];

function row(extra: Record<string, unknown> = {}): PublicPostingRow {
  return {
    id: "posting-1",
    blindTitle: "서울 제조업 생산직",
    sido: "SEOUL",
    sigungu: null,
    industryCode: "C",
    role: "생산직",
    payMin: 2_500_000,
    payMax: 3_000_000,
    overtimeNote: "SOMETIMES",
    dormitory: "FREE",
    meals: "PROVIDED",
    shift: "DAY",
    headcount: 2,
    eligibleVisas: ["F-4"],
    verifiedAt: new Date(),
    ...extra,
  } as PublicPostingRow;
}

describe("R-202 publicPosting serializer", () => {
  it("R-202: output keys are exactly BLIND_JOB_FIELDS (WO §8.5)", () => {
    const out = serializePublicPosting(row(), "제2026-0000000-00-0-00000호");
    expect(Object.keys(out).sort()).toEqual([...BLIND_JOB_FIELDS].sort());
    expect(out.verified).toBe(true);
    expect(out.placementRegNo).toBe("제2026-0000000-00-0-00000호");
  });

  it("R-202 / BR-03: extra columns on the input (company, lead, contacts) never reach the output", () => {
    const polluted = row({
      companyId: "co-1",
      company: { nameEnc: "한빛정밀 주식회사", bizRegNoEnc: "1234567890" },
      companyName: "한빛정밀 주식회사",
      leadId: "lead-1",
      lead: { title: "한빛정밀 생산직", contactPhoneEnc: "010-1234-5678" },
      verifiedBy: "staff-1",
      contactPhone: "010-1234-5678",
      address: "서울특별시 중구 세종대로 1",
    });
    const out = serializePublicPosting(polluted, "");
    for (const key of FORBIDDEN_KEYS) expect(out).not.toHaveProperty(key);
    const json = JSON.stringify(out);
    expect(json).not.toMatch(/한빛정밀|010-1234-5678|세종대로|1234567890|staff-1|lead-1|co-1/);
    expect(out.placementRegNo).toBeNull();
  });

  it("R-202: the DB select reads no forbidden column", () => {
    for (const key of FORBIDDEN_KEYS) expect(PUBLIC_POSTING_SELECT).not.toHaveProperty(key);
  });

  it("WO15-04: an unverified row cannot be serialized as public", () => {
    expect(() => serializePublicPosting(row({ verifiedAt: null }), "")).toThrow(/not verified/);
  });

  it("R-202: the output is frozen (no key can be added after serialization)", () => {
    const out = serializePublicPosting(row(), "");
    expect(Object.isFrozen(out)).toBe(true);
    expect(() => {
      (out as unknown as Record<string, unknown>).companyName = "x";
    }).toThrow();
  });
});
