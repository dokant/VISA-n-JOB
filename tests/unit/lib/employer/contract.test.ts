/**
 * R-208 / WO §9.4: the employer contract. The terms box is required; the 체류 업무 위임 box is
 * separate and optional — the contract completes without it. Terms drafts carry
 * [전문가 검토 필요] in all six languages and translations carry the Korean original (SC-08).
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { locales } from "@/i18n/locales";
import { candidateAccessOf } from "@/lib/candidates/access";
import { db } from "@/lib/db";
import {
  EMPLOYER_TERMS_CONSENT,
  EMPLOYER_VISA_MANDATE_CONSENT,
  contractStatusOf,
  currentTermsVersion,
  getTermsDocument,
  signEmployerContract,
  termsPdfPath,
} from "@/lib/employer/contract";

import { company } from "../candidates/candidateFixtures";

afterAll(() => db.$disconnect());

describe("R-208 employer contract", () => {
  it("R-208: the contract completes WITHOUT the visa mandate (separate, optional box)", async () => {
    const c = await company({ verified: true });
    const now = new Date("2026-12-01T01:00:00.000Z");
    const r = await signEmployerContract({
      actor: c,
      termsAgreed: true,
      visaMandate: false,
      locale: "vi",
      ip: null,
      now,
    });
    expect(r).toEqual({ ok: true, version: currentTermsVersion(), visaMandateAgreed: false });
    expect(await contractStatusOf(c.companyId)).toEqual({
      signedAt: now,
      version: currentTermsVersion(),
      visaMandateAgreed: false,
      verified: true,
    });
    const consents = await db.consent.findMany({ where: { userId: c.id } });
    expect(consents.map((x) => x.type)).toEqual([EMPLOYER_TERMS_CONSENT]);
    expect(consents[0]).toMatchObject({ version: currentTermsVersion(), locale: "vi" });
    // verified + contract → the candidate list (R-205)
    expect((await candidateAccessOf(c.companyId)).level).toBe("LIST");
  });

  it("R-208: ticking the mandate box records it separately", async () => {
    const c = await company();
    const r = await signEmployerContract({
      actor: c,
      termsAgreed: true,
      visaMandate: true,
      locale: "ko",
      ip: "198.51.100.20",
    });
    expect(r).toMatchObject({ ok: true, visaMandateAgreed: true });
    const types = (await db.consent.findMany({ where: { userId: c.id } })).map((x) => x.type);
    expect(types.sort()).toEqual([EMPLOYER_TERMS_CONSENT, EMPLOYER_VISA_MANDATE_CONSENT].sort());
    expect((await db.consent.findFirstOrThrow({ where: { userId: c.id } })).ipHash).not.toBeNull();
    // not verified yet → still the summary only
    expect((await candidateAccessOf(c.companyId)).level).toBe("STATS");
  });

  it("the terms box is required; a signed company cannot sign twice", async () => {
    const c = await company();
    const base = { actor: c, visaMandate: true, locale: "ko" as const, ip: null };
    expect(await signEmployerContract({ ...base, termsAgreed: false })).toEqual({
      ok: false,
      code: "TERMS_REQUIRED",
    });
    expect((await contractStatusOf(c.companyId))?.signedAt).toBeNull();
    expect(await db.consent.count({ where: { userId: c.id } })).toBe(0);
    expect((await signEmployerContract({ ...base, termsAgreed: true })).ok).toBe(true);
    expect(await signEmployerContract({ ...base, termsAgreed: true })).toEqual({
      ok: false,
      code: "ALREADY_SIGNED",
    });
    expect(await db.consent.count({ where: { userId: c.id } })).toBe(2);
  });

  it("N-03 / SC-08: every terms draft has [전문가 검토 필요]; translations carry the Korean original", () => {
    const version = currentTermsVersion();
    const ko = getTermsDocument("ko").body;
    for (const locale of locales) {
      const doc = getTermsDocument(locale);
      expect(doc.locale).toBe(locale);
      expect(doc.body).toContain("[전문가 검토 필요]");
      // WO §9.4 items: fee within the legal limit, 12-month direct hire, mandate guarantee
      if (locale !== "ko") {
        expect(doc.body).toContain("소개요금");
        expect(doc.body).toContain("체류 업무 위임");
      }
    }
    expect(ko).toContain("법정 한도 이내");
    expect(ko).toContain("12개월");
    expect(ko).toContain("3개월");
    expect(termsPdfPath(version, "zh")).toBe(`/docs/employer-terms-${version}-zh.pdf`);
    expect(termsPdfPath(version, "xx")).toBe(`/docs/employer-terms-${version}-ko.pdf`);
  });

  it("R-208: a PDF of every terms file is in public/docs (scripts/build-terms-pdf.ts)", () => {
    const version = currentTermsVersion();
    for (const locale of locales) {
      const file = path.join(process.cwd(), "public", termsPdfPath(version, locale));
      expect(existsSync(file)).toBe(true);
      expect(readFileSync(file).subarray(0, 5).toString("latin1")).toBe("%PDF-");
    }
  });
});
