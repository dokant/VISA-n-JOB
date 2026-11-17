/**
 * R-208: scripts/build-terms-pdf.ts — the Markdown of the terms drafts becomes escaped HTML that
 * keeps the [전문가 검토 필요] line, and every terms file has its PDF target in public/docs.
 */
import path from "node:path";

import { describe, expect, it } from "vitest";

import { locales } from "@/i18n/locales";

import { listTermsFiles, markdownToHtml, termsHtml } from "../../../scripts/build-terms-pdf";

describe("R-208 build-terms-pdf", () => {
  it("converts headings, lists, rules and paragraphs, escaping everything else", () => {
    const html = markdownToHtml(
      "# 제목\n\n[전문가 검토 필요] 초안입니다.\n\n## 제1조\n\n- 하나 <b>\n- 둘 & 셋\n\n---\n\n문단 한 줄\n이어지는 줄",
    );
    expect(html).toContain("<h1>제목</h1>");
    expect(html).toContain('<p class="review">[전문가 검토 필요] 초안입니다.</p>');
    expect(html).toContain("<h2>제1조</h2>");
    expect(html).toContain("<ul><li>하나 &lt;b&gt;</li><li>둘 &amp; 셋</li></ul>");
    expect(html).toContain("<hr />");
    expect(html).toContain("<p>문단 한 줄 이어지는 줄</p>");
    expect(html).not.toContain("<b>");
    expect(termsHtml("# x", "zh")).toContain('<html lang="zh">');
  });

  it("lists one PDF per locale of the current terms version", () => {
    const files = listTermsFiles();
    expect(files.map((f) => f.locale).sort()).toEqual([...locales].sort());
    for (const f of files) {
      expect(path.basename(f.out)).toBe(`employer-terms-${f.version}-${f.locale}.pdf`);
      expect(path.relative(process.cwd(), f.out).split(path.sep).slice(0, 2)).toEqual([
        "public",
        "docs",
      ]);
    }
  });
});
