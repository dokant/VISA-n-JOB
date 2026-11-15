import path from "node:path";
import { describe, expect, it } from "vitest";

import { RULES, runRules, scanText } from "../../../scripts/lib/qa-rules";

function rule(id: string) {
  const r = RULES.find((x) => x.id === id);
  if (!r) throw new Error(`rule not found: ${id}`);
  return r;
}

describe("qa:static rules", () => {
  it("BR-13 flags passport / alien registration field names", () => {
    const r = rule("BR-13/identifier-fields");
    expect(scanText(r, "prisma/schema.prisma", "  passportNoEnc String")).toHaveLength(1);
    expect(scanText(r, "src/lib/x.ts", "const alienRegNo = 1")).toHaveLength(1);
    expect(scanText(r, "src/lib/x.ts", "hasArc: boolean")).toHaveLength(0);
  });

  it("BR-01 flags tel:/mailto:/messenger links except the operator allowlist", () => {
    const r = rule("BR-01/direct-contact-links");
    expect(scanText(r, "src/components/employer/card.tsx", 'href="tel:0101234"')).toHaveLength(1);
    expect(scanText(r, "src/components/seeker/x.tsx", "https://t.me/someone")).toHaveLength(1);
    expect(
      scanText(r, "src/components/common/site-footer.tsx", 'href="mailto:a@b.c"'),
    ).toHaveLength(0);
  });

  it("BR-09 flags ledger mutations", () => {
    const r = rule("BR-09/ledger-mutation");
    expect(scanText(r, "src/lib/a.ts", "await prisma.recommendation.update({})")).toHaveLength(1);
    expect(scanText(r, "src/lib/a.ts", "await tx.auditLog.deleteMany()")).toHaveLength(1);
    expect(scanText(r, "src/lib/a.ts", "await prisma.auditLog.create({})")).toHaveLength(0);
  });

  it("BR-12 flags visa code literals but not format regexes", () => {
    const r = rule("BR-12/visa-code-literal");
    expect(scanText(r, "src/lib/a.ts", 'if (code === "E-9") {}')).toHaveLength(1);
    expect(scanText(r, "src/lib/a.ts", "const c = 'E-7-4';")).toHaveLength(1);
    expect(scanText(r, "src/lib/a.ts", "const re = /^[A-H]-\\d/;")).toHaveLength(0);
  });

  it("S-02 / S-06 flag hard-coded colors and arbitrary spacing", () => {
    const color = rule("S-02/hardcoded-color");
    const spacing = rule("S-06/arbitrary-spacing");
    expect(scanText(color, "src/c.tsx", 'className="text-red-600"')).toHaveLength(1);
    expect(scanText(color, "src/c.tsx", 'className="text-primary"')).toHaveLength(0);
    expect(scanText(spacing, "src/c.tsx", 'className="p-[13px]"')).toHaveLength(1);
    expect(scanText(spacing, "src/c.tsx", 'className="shadow-xl"')).toHaveLength(1);
    expect(scanText(spacing, "src/c.tsx", 'className="p-4 shadow-sm"')).toHaveLength(1);
    expect(
      scanText(spacing, "src/c.tsx", 'className="p-6.5 shadow-1 hover:shadow-2"'),
    ).toHaveLength(0);
    expect(scanText(spacing, "src/c.tsx", 'className="shadow-ink shadow-cta"')).toHaveLength(0);
    expect(scanText(color, "src/app/brand.css", ".vj-x { background: #050d24; }")).toHaveLength(0);
    expect(scanText(color, "src/c.tsx", 'className="bg-brand-orange"')).toHaveLength(0);
  });

  it("S-03 flags font CDN loading", () => {
    const r = rule("S-03/font-cdn");
    expect(
      scanText(r, "src/app/x.css", '@import url("https://cdn.jsdelivr.net/gh/orioncactus/x.css");'),
    ).toHaveLength(1);
    expect(
      scanText(r, "src/lib/fonts.ts", 'import localFont from "next/font/local";'),
    ).toHaveLength(0);
  });

  it("S-23 flags forbidden CTA phrases in messages", () => {
    const r = rule("S-23/forbidden-phrases");
    expect(scanText(r, "messages/ko.json", '"cta": "지원하기"')).toHaveLength(1);
    expect(scanText(r, "messages/en.json", '"cta": "Apply now"')).toHaveLength(1);
    expect(scanText(r, "messages/ko.json", '"cta": "면접 신청"')).toHaveLength(0);
  });

  it("the current repository has 0 error hits", () => {
    const errors = runRules(path.resolve(".")).filter((h) => h.rule.severity === "error");
    expect(errors.map((h) => `${h.rule.id} ${h.file}:${h.line}`)).toEqual([]);
  });
});
