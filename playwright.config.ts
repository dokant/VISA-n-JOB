import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;
const DEMAND_PORT = PORT + 1;
/** Server with FEATURE_DEMAND_MAP=true (tests read it from E2E_DEMAND_URL). */
const demandURL = `http://127.0.0.1:${DEMAND_PORT}`;
process.env.E2E_DEMAND_URL = demandURL;

// E2E runs against a production build (PLAN P0a task 5).
// `next` resolves from node_modules/.bin because `pnpm test:e2e` puts it on PATH.
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // N-04: 375px mobile width, Chromium engine.
      name: "mobile-375",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: [
    {
      command: `next build && next start --hostname 127.0.0.1 --port ${PORT}`,
      url: baseURL + "/ko",
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      // Same build with FEATURE_DEMAND_MAP on (R-117 / SC-07 flag-on checks). Started after the first
      // server is ready, so the build exists. Flags are read at request time on dynamic pages.
      command: `next start --hostname 127.0.0.1 --port ${DEMAND_PORT}`,
      url: demandURL + "/ko/demand",
      env: { FEATURE_DEMAND_MAP: "true" },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
