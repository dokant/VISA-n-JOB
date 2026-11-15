import { describe, expect, it } from "vitest";

import { getSiteConfig } from "@/config/site.config";

describe("R-015 site.config", () => {
  it("falls back to placeholders when env is empty", () => {
    const config = getSiteConfig({});
    expect(config.serviceName).toBe("비자앤잡");
    expect(config.adminScrivenerOfficeName).toMatch(/^\[.+\]$/);
    expect(config.adminScrivenerRegNo).toMatch(/^\[.+\]$/);
    expect(config.jobPlacementRegNo).toMatch(/^\[.+\]$/);
    expect(config.representative).toMatch(/^\[.+\]$/);
    expect(config.address).toMatch(/^\[.+\]$/);
    expect(config.feesPath).toBe("/fees");
  });

  it("uses env values when provided", () => {
    const config = getSiteConfig({
      SITE_ADMIN_SCRIVENER_OFFICE_NAME: "테스트 사무소",
      SITE_ADDRESS: "  서울  ",
      SITE_REPRESENTATIVE: "",
    });
    expect(config.adminScrivenerOfficeName).toBe("테스트 사무소");
    expect(config.address).toBe("서울");
    expect(config.representative).toMatch(/^\[.+\]$/);
  });
});
