/**
 * pnpm lighthouse — R-103 (PLAN P1a-9).
 *
 * 1. `next build` (skip with --skip-build), then `next start` on 127.0.0.1:LH_PORT (default 3200).
 *    The app reads DATABASE_URL from .env; the local database must be running (pnpm db:start).
 * 2. Runs Lighthouse (mobile preset = Lighthouse default: Moto G-class emulation, simulated slow 4G)
 *    3 times for /ko, /ko/about, /ko/fees, /ko/terms and takes the median of each score.
 *    Chrome = Playwright's Chromium headless shell (CHROME_PATH overrides). On this Windows machine
 *    spawning the full chrome.exe from Node fails with "spawn UNKNOWN", the headless shell works.
 * 3. Writes .lighthouse/{page}-{run}.json and .lighthouse/summary.json, prints a table and exits 1
 *    when any median is below performance 85 or accessibility 90.
 * Usage: tsx scripts/lighthouse.ts [--skip-build] [--runs N]
 */
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium } from "@playwright/test";

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, ".lighthouse");
const PORT = Number(process.env.LH_PORT ?? 3200);
const BASE = `http://127.0.0.1:${PORT}`;
const PAGES = ["/ko", "/ko/about", "/ko/fees", "/ko/terms"];
const THRESHOLD = { performance: 0.85, accessibility: 0.9 };

const args = process.argv.slice(2);
const skipBuild = args.includes("--skip-build");
const runsArg = args.indexOf("--runs");
const RUNS = runsArg >= 0 ? Number(args[runsArg + 1]) : 3;

const NEXT_BIN = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
const LH_BIN = path.join(ROOT, "node_modules", "lighthouse", "cli", "index.js");

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

async function waitFor(url: string, timeoutMs: number): Promise<void> {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`server did not answer ${url}`);
}

type LhReport = {
  categories: Record<string, { score: number | null }>;
  audits: Record<string, { numericValue?: number; details?: { items?: unknown[] } }>;
};

/** CHROME_PATH, else Playwright's headless shell next to its Chromium, else Playwright's Chromium. */
function chromePath(): string {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const full = chromium.executablePath();
  const cache = path.resolve(path.dirname(full), "..", "..");
  const shellDir = existsSync(cache)
    ? readdirSync(cache).find((d) => d.startsWith("chromium_headless_shell-"))
    : undefined;
  if (shellDir) {
    const dir = path.join(cache, shellDir);
    for (const sub of readdirSync(dir)) {
      for (const exe of ["chrome-headless-shell.exe", "chrome-headless-shell"]) {
        const file = path.join(dir, sub, exe);
        if (existsSync(file)) return file;
      }
    }
  }
  return full;
}

function runLighthouse(url: string, file: string): LhReport {
  const r = spawnSync(
    process.execPath,
    [
      LH_BIN,
      url,
      "--output=json",
      `--output-path=${file}`,
      "--only-categories=performance,accessibility",
      "--quiet",
    ],
    { env: { ...process.env, CHROME_PATH: chromePath() }, stdio: "inherit" },
  );
  if (r.status !== 0) throw new Error(`lighthouse failed for ${url}`);
  return JSON.parse(readFileSync(file, "utf8")) as LhReport;
}

function lcpElement(report: LhReport): string {
  const items = report.audits["largest-contentful-paint-element"]?.details?.items ?? [];
  const first = items[0] as { items?: Array<{ node?: { snippet?: string } }> } | undefined;
  return first?.items?.[0]?.node?.snippet ?? "";
}

async function main(): Promise<number> {
  mkdirSync(OUT, { recursive: true });
  if (!skipBuild) {
    const b = spawnSync(process.execPath, [NEXT_BIN, "build"], { cwd: ROOT, stdio: "inherit" });
    if (b.status !== 0) return 1;
  }
  const server: ChildProcess = spawn(
    process.execPath,
    [NEXT_BIN, "start", "--hostname", "127.0.0.1", "--port", String(PORT)],
    { cwd: ROOT, stdio: "ignore" },
  );
  try {
    await waitFor(`${BASE}/ko`, 60_000);
    // Warm up every page once (first request compiles caches).
    for (const p of PAGES) await fetch(BASE + p);

    const summary: Array<Record<string, unknown>> = [];
    let failed = false;
    for (const p of PAGES) {
      const perf: number[] = [];
      const a11y: number[] = [];
      const lcp: number[] = [];
      let lcpNode = "";
      for (let i = 1; i <= RUNS; i++) {
        const name = `${p.replace(/\//g, "_").replace(/^_/, "")}-${i}.json`;
        const report = runLighthouse(BASE + p, path.join(OUT, name));
        perf.push(report.categories.performance.score ?? 0);
        a11y.push(report.categories.accessibility.score ?? 0);
        lcp.push(report.audits["largest-contentful-paint"]?.numericValue ?? 0);
        lcpNode = lcpElement(report) || lcpNode;
      }
      const row = {
        page: p,
        performance: Math.round(median(perf) * 100),
        accessibility: Math.round(median(a11y) * 100),
        lcpMs: Math.round(median(lcp)),
        runs: {
          performance: perf.map((s) => Math.round(s * 100)),
          accessibility: a11y.map((s) => Math.round(s * 100)),
        },
        lcpElement: lcpNode.slice(0, 160),
      };
      if (median(perf) < THRESHOLD.performance || median(a11y) < THRESHOLD.accessibility)
        failed = true;
      summary.push(row);
      console.log(
        `${p.padEnd(12)} performance ${String(row.performance).padStart(3)}  accessibility ${String(row.accessibility).padStart(3)}  LCP ${row.lcpMs}ms  runs ${JSON.stringify(row.runs)}`,
      );
    }
    writeFileSync(
      path.join(OUT, "summary.json"),
      JSON.stringify(
        {
          at: new Date().toISOString(),
          preset: "mobile (Lighthouse default)",
          runs: RUNS,
          pages: summary,
        },
        null,
        2,
      ),
    );
    console.log(
      failed
        ? "\nlighthouse: BELOW THRESHOLD (performance >= 85, accessibility >= 90)"
        : "\nlighthouse: all pages meet the thresholds",
    );
    return failed ? 1 : 0;
  } finally {
    server.kill();
  }
}

main().then(
  (code) => process.exit(code),
  (err: unknown) => {
    console.error(err);
    process.exit(1);
  },
);
