import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { getInternalContact, getSiteConfig } from "@/config/site.config";

describe("R-015 site.config", () => {
  it("defaults to the operator information (SITE_INFO, Q-06 / Q-07)", () => {
    const config = getSiteConfig({});
    expect(config.brand).toEqual({ wordmark: "VISA n JOB", nameKo: "비자앤잡", tagline: "" });

    expect(config.adminScrivenerOffice).toEqual({
      name: "코리아비자행정사사무소",
      representative: "정충교",
      businessRegNo: "748-39-01213",
      adminScrivenerRegNo: "24-SU-RG-042",
      address: "서울특별시 송파구 법원로9길 26 에이치비즈니스파크 C동 1층 128호",
      phone: "02-6281-8901",
    });
    expect(config.jobPlacementAgency).toEqual({
      name: "비자앤잡 유료직업소개소",
      representative: "정충교",
      jobPlacementRegNo: "제2026-3230291-14-5-00014호",
      address: "서울특별시 송파구 법원로9길 26 에이치비즈니스파크 C동 1층 128호",
      phone: "02-6281-8901",
    });
    expect(config.contact).toEqual({ phone: "02-6281-8901", email: "" });
    expect(config.feesPath).toBe("/fees");
  });

  it("PC-7: has no operator metrics until the operator enters them", () => {
    expect(getSiteConfig({}).metrics).toEqual([]);
  });

  it("Q-06: public config has no mobile number and no bank account data", () => {
    const serialized = JSON.stringify(getSiteConfig({}));
    expect(serialized).not.toMatch(/010-?\d{3,4}-?\d{4}/);
    expect(serialized).not.toMatch(/계좌|은행|account|bank|iban/i);

    const source = readFileSync(path.resolve("src/config/site.config.ts"), "utf8");
    expect(source).not.toMatch(/010-?\d{3,4}-?\d{4}/);
    expect(source).not.toMatch(/accountNo|bankAccount|depositAccount|입금계좌:/i);
  });

  it("keeps the mobile number internal and env-only", () => {
    expect(getInternalContact({}).mobilePhone).toBe("");
    expect(getInternalContact({ SITE_OPERATOR_MOBILE: " 010-0000-0000 " }).mobilePhone).toBe(
      "010-0000-0000",
    );
    const config = getSiteConfig({ SITE_OPERATOR_MOBILE: "010-0000-0000" });
    expect(JSON.stringify(config)).not.toContain("010-0000-0000");
  });

  it("uses env values when provided and ignores empty ones", () => {
    const config = getSiteConfig({
      SITE_ADMIN_SCRIVENER_OFFICE_NAME: "테스트 사무소",
      SITE_ADDRESS: "  서울  ",
      SITE_REPRESENTATIVE: "",
      SITE_BRAND_WORDMARK: "TEST",
      SITE_PHONE: "02-000-0000",
    });
    expect(config.adminScrivenerOffice.name).toBe("테스트 사무소");
    expect(config.adminScrivenerOffice.address).toBe("서울");
    expect(config.jobPlacementAgency.address).toBe("서울");
    expect(config.adminScrivenerOffice.representative).toBe("정충교");
    expect(config.brand.wordmark).toBe("TEST");
    expect(config.contact.phone).toBe("02-000-0000");
  });
});
