/** R-104: phone numbers are normalised to E.164 before hashing (one phoneHash per number). */
import { describe, expect, it } from "vitest";

import { normalizePhone } from "@/lib/phone";

describe("R-104 normalizePhone", () => {
  it("reads Korean national numbers and international formats as the same E.164", () => {
    for (const v of ["010-1234-5670", "01012345670", "+82 10 1234 5670", "0082-10-1234-5670"]) {
      expect(normalizePhone(v)).toBe("+821012345670");
    }
    expect(normalizePhone("+84 912 345 678")).toBe("+84912345678");
  });

  it("rejects anything that is not a phone number", () => {
    for (const v of [
      "",
      "abc",
      "12345",
      "1012345678",
      "+0123456789",
      "+82 10",
      "+1234567890123456",
    ]) {
      expect(normalizePhone(v)).toBeNull();
    }
  });
});
