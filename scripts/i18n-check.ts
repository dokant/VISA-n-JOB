/**
 * pnpm i18n:check — R-014, N-02.
 * Every messages/{locale}.json must have the same keys as ko.json and start with
 * "_review": "native review required". Exits 1 on any error.
 * Usage: tsx scripts/i18n-check.ts [messagesDir]
 */
import path from "node:path";

import { checkMessagesDir, flattenKeys, readMessages } from "./lib/i18n";

function main(): number {
  const dir = path.resolve(process.argv[2] ?? "messages");
  const reports = checkMessagesDir(dir);
  let errorCount = 0;

  let sourceKeyCount = 0;
  try {
    sourceKeyCount = flattenKeys(readMessages(path.join(dir, "ko.json"))).size;
  } catch {
    // reported by checkMessagesDir
  }

  for (const report of reports) {
    const status = report.errors.length === 0 ? "OK  " : "FAIL";
    console.log(
      `[${status}] ${report.locale}: ${report.errors.length} error(s), ${report.warnings.length} warning(s)`,
    );
    for (const e of report.errors) console.log(`       error   ${e}`);
    for (const w of report.warnings) console.log(`       warning ${w}`);
    errorCount += report.errors.length;
  }

  console.log(
    `\ni18n:check — source ko: ${sourceKeyCount} key(s), locales: ${reports.length}, errors: ${errorCount}`,
  );
  return errorCount === 0 ? 0 : 1;
}

process.exit(main());
