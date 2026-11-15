import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { checkMessagesDir, compareLocale, flattenKeys, LOCALES } from "../../../scripts/lib/i18n";

const ko = { _review: "native review required", a: { b: "에이", c: { d: "디" } }, e: "이" };

describe("R-014 i18n:check", () => {
  it("flattens nested keys and skips _review", () => {
    expect([...flattenKeys(ko).keys()]).toEqual(["a.b", "a.c.d", "e"]);
  });

  it("passes when keys match and _review is first", () => {
    const en = { _review: "native review required", a: { b: "A", c: { d: "D" } }, e: "E" };
    expect(compareLocale("en", ko, en).errors).toEqual([]);
  });

  it("reports a missing key", () => {
    const en = { _review: "native review required", a: { b: "A" }, e: "E" };
    expect(compareLocale("en", ko, en).errors).toContain("missing key: a.c.d");
  });

  it("reports extra keys, wrong _review and non-first _review", () => {
    const extra = {
      _review: "native review required",
      a: { b: "A", c: { d: "D" } },
      e: "E",
      x: "X",
    };
    expect(compareLocale("en", ko, extra).errors).toContain("extra key not in ko: x");

    const wrong = { _review: "done", a: { b: "A", c: { d: "D" } }, e: "E" };
    expect(compareLocale("en", ko, wrong).errors[0]).toMatch(/must be "native review required"/);

    const notFirst = { a: { b: "A", c: { d: "D" } }, _review: "native review required", e: "E" };
    expect(compareLocale("en", ko, notFirst).errors[0]).toMatch(/must be the first key/);
  });

  it("R-014: the real messages/ directory has 0 errors for all six locales", () => {
    const reports = checkMessagesDir(path.resolve("messages"));
    expect(reports.map((r) => r.locale)).toEqual([...LOCALES]);
    for (const r of reports) expect(r.errors, r.locale).toEqual([]);
  });

  it("fails when a key is removed from en.json (copy of real files)", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "i18n-"));
    for (const locale of LOCALES) {
      const json = JSON.parse(readFileSync(path.resolve("messages", `${locale}.json`), "utf8"));
      if (locale === "en") delete json.common.localeSwitcher.label;
      writeFileSync(path.join(dir, `${locale}.json`), JSON.stringify(json));
    }
    const en = checkMessagesDir(dir).find((r) => r.locale === "en");
    expect(en?.errors).toContain("missing key: common.localeSwitcher.label");
  });
});
