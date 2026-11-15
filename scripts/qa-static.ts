/**
 * pnpm qa:static: static BR checks run at the end of every phase (PLAN common rule 4).
 * Exits 1 when any "error" rule matches. "warn" hits are listed for human / QA review.
 * Usage: tsx scripts/qa-static.ts [repoRoot]
 */
import path from "node:path";

import { RULES, runRules } from "./lib/qa-rules";

function main(): number {
  const root = path.resolve(process.argv[2] ?? ".");
  const hits = runRules(root);
  const errors = hits.filter((h) => h.rule.severity === "error");
  const warns = hits.filter((h) => h.rule.severity === "warn");

  for (const h of [...errors, ...warns]) {
    const loc = h.line ? `${h.file}:${h.line}` : h.file;
    const text = h.text ? `  ${h.text}` : "";
    console.log(`[${h.rule.severity.toUpperCase()}] ${h.rule.id} ${loc}${text}`);
  }

  console.log(
    `\nqa:static: ${RULES.length} line rules + structural checks, errors: ${errors.length}, warnings: ${warns.length}`,
  );
  if (warns.length > 0) console.log("Warnings need human / QA review; they do not fail the run.");
  return errors.length === 0 ? 0 : 1;
}

process.exit(main());
