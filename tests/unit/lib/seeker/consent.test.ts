/**
 * R-110 / N-03: consent bodies live in content/consents/{type}/{version}/{locale}.md, every draft is
 * marked [전문가 검토 필요], translations carry the Korean original (SC-08).
 */
import { describe, expect, it } from "vitest";

import { locales } from "@/i18n/locales";
import { consentIpHash, currentConsentVersion, getConsentDocument } from "@/lib/seeker/consent";
import { REGISTRATION_CONSENTS } from "@/lib/seeker/options";

describe("R-110 consent documents", () => {
  it.each(REGISTRATION_CONSENTS)("N-03: %s has a v1 draft in all 6 locales", (type) => {
    expect(currentConsentVersion(type)).toBe("v1");
    const ko = getConsentDocument(type, "ko").body;
    for (const locale of locales) {
      const doc = getConsentDocument(type, locale);
      expect(doc.body).toContain("[전문가 검토 필요]");
      if (locale !== "ko") {
        // SC-08: the Korean original is included with the translation
        const koTitle = ko.split("\n")[0].replace(/^# /, "");
        expect(doc.body).toContain(koTitle);
      }
      // MDX safety: no braces / angle brackets in drafts
      expect(doc.body).not.toMatch(/[{}<>]/);
    }
  });

  it("BR-13: the privacy draft says that registration and passport numbers are not collected", () => {
    expect(getConsentDocument("PRIVACY_REQUIRED", "ko").body).toMatch(/외국인등록번호, 여권번호/);
  });

  it("ipHash is an HMAC (never the address) and null without a trusted address", () => {
    expect(consentIpHash(null)).toBeNull();
    const h = consentIpHash("203.0.113.5");
    expect(h).toMatch(/^[0-9a-f]{64}$|^[A-Za-z0-9+/=_-]{20,}$/);
    expect(h).not.toContain("203.0.113.5");
  });
});
