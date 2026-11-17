/**
 * pnpm terms:pdf — 구인 서비스 이용약관 PDF (PRD R-208, WO §9.4, PLAN P2b 작업 5).
 *
 * Renders every `content/terms/employer/{version}/{locale}.md` to
 * `public/docs/employer-terms-{version}-{locale}.pdf` with Playwright (Chromium, A-2). The PDF is
 * what the contract page offers for download (src/lib/employer/contract.ts `termsPdfPath`), so it
 * must be rebuilt and committed whenever a terms file changes. Every PDF starts with the
 * [전문가 검토 필요] line of the draft, and translations carry the Korean original (SC-08).
 *
 * The Markdown of the drafts is simple (headings, paragraphs, "-" lists, "---"); `markdownToHtml`
 * handles exactly that and escapes everything else, so no Markdown library is needed.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
export const TERMS_ROOT = path.join(ROOT, "content", "terms", "employer");
export const OUT_DIR = path.join(ROOT, "public", "docs");

const EXPERT_REVIEW = "[전문가 검토 필요]";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Headings (#, ##, ###), "-" lists, "---" rules and paragraphs. Other text is escaped as is. */
export function markdownToHtml(md: string): string {
  const out: string[] = [];
  let list: string[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length > 0) {
      const text = para.join(" ");
      const cls = text.startsWith(EXPERT_REVIEW) ? ' class="review"' : "";
      out.push(`<p${cls}>${escapeHtml(text)}</p>`);
      para = [];
    }
    if (list.length > 0) {
      out.push(`<ul>${list.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`);
      list = [];
    }
  };
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    const heading = /^(#{1,3}) (.*)$/.exec(line);
    if (line === "") flush();
    else if (line === "---") {
      flush();
      out.push("<hr />");
    } else if (heading) {
      flush();
      const level = heading[1].length;
      out.push(`<h${level}>${escapeHtml(heading[2])}</h${level}>`);
    } else if (line.startsWith("- ")) {
      if (para.length > 0) flush();
      list.push(line.slice(2));
    } else {
      if (list.length > 0) flush();
      para.push(line);
    }
  }
  flush();
  return out.join("\n");
}

export function termsHtml(md: string, locale: string): string {
  return `<!doctype html>
<html lang="${escapeHtml(locale)}">
<head>
<meta charset="utf-8" />
<title>VISA n JOB employer terms</title>
<style>
  body { font-family: "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", "Microsoft YaHei",
    "PingFang SC", "Noto Sans CJK SC", "Segoe UI", Arial, sans-serif; color: #111827;
    font-size: 11pt; line-height: 1.6; margin: 0; }
  h1 { font-size: 18pt; color: #0B1B3F; margin: 0 0 8pt; }
  h2 { font-size: 13pt; color: #0B1B3F; margin: 16pt 0 4pt; }
  h3 { font-size: 11.5pt; color: #0B1B3F; margin: 12pt 0 4pt; }
  p, li { margin: 4pt 0; }
  ul { padding-left: 16pt; }
  hr { border: 0; border-top: 1px solid #E5E7EB; margin: 18pt 0; }
  .review { border: 1px solid #A84B0D; color: #A84B0D; padding: 6pt 8pt; font-weight: 600; }
</style>
</head>
<body>
${markdownToHtml(md)}
</body>
</html>`;
}

export type TermsFile = { version: string; locale: string; file: string; out: string };

export function listTermsFiles(root: string = TERMS_ROOT, outDir: string = OUT_DIR): TermsFile[] {
  if (!existsSync(root)) return [];
  const files: TermsFile[] = [];
  for (const version of readdirSync(root).filter((v) => /^v[0-9]+$/.test(v))) {
    for (const name of readdirSync(path.join(root, version)).filter((f) => f.endsWith(".md"))) {
      const locale = name.replace(/\.md$/, "");
      files.push({
        version,
        locale,
        file: path.join(root, version, name),
        out: path.join(outDir, `employer-terms-${version}-${locale}.pdf`),
      });
    }
  }
  return files;
}

async function main(): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const files = listTermsFiles();
  if (files.length === 0) throw new Error("no terms files under content/terms/employer");
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    for (const f of files) {
      const md = readFileSync(f.file, "utf8");
      if (!md.includes(EXPERT_REVIEW)) throw new Error(`${f.file}: missing ${EXPERT_REVIEW}`);
      await page.setContent(termsHtml(md, f.locale), { waitUntil: "load" });
      await page.pdf({
        path: f.out,
        format: "A4",
        margin: { top: "18mm", bottom: "18mm", left: "16mm", right: "16mm" },
        printBackground: true,
      });
      console.log(JSON.stringify({ pdf: path.relative(ROOT, f.out) }));
    }
  } finally {
    await browser.close();
  }
}

// Run only when executed directly (tsx scripts/build-terms-pdf.ts), not when imported by tests.
if (/build-terms-pdf\.ts$/.test(process.argv[1] ?? "")) {
  main().catch((e: unknown) => {
    console.error("[terms:pdf] failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
