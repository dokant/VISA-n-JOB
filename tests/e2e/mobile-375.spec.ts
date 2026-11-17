import { expect, type Page, test } from "@playwright/test";

import { uniquePhone } from "./support/authDb";
import { isolate, quickRegisterUi } from "./support/seekerFlow";

// N-04 일괄 점검 (P2e 작업 3): the main public and seeker screens at 375px have no horizontal scroll,
// in all six locales. Runs in the mobile-375 project only (375×812, touch). Flag-gated pages are
// checked on their flag-on servers too (the default server shows ComingSoon for them).
const DEFAULT_URL = `http://localhost:${process.env.E2E_PORT ?? 3100}`;
const JOBS_URL = `http://localhost:${process.env.E2E_JOBS_PORT ?? 3102}`;
const DEMAND_URL = (process.env.E2E_DEMAND_URL ?? "http://127.0.0.1:3101").replace(
  "127.0.0.1",
  "localhost",
);

test.use({ baseURL: DEFAULT_URL });
test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== "mobile-375", "375px project only (N-04)");
  await isolate(page);
});

const LOCALES = ["ko", "en", "vi", "ru", "zh", "uz"] as const;

/** Public pages (no sign-in). */
const PUBLIC_PATHS = [
  "",
  "/about",
  "/cases",
  "/fees",
  "/guide",
  "/guide/how-to-use",
  "/privacy",
  "/terms",
  "/visa-check",
  "/score/e74",
  "/jobs",
  "/demand",
  "/employer/diagnosis",
  "/employer/request",
  "/employer/login",
  "/employer/signup",
  "/seeker/login",
  "/seeker/register",
  "/seeker/register/quick",
] as const;

/** Signed-in seeker pages. */
const SEEKER_PATHS = [
  "/seeker/me",
  "/seeker/me/referral",
  "/seeker/me/stay",
  "/seeker/me/recommended",
  "/seeker/register",
] as const;

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

/** Opens each path and collects the ones that scroll sideways (all reported at once). */
async function overflowing(page: Page, urls: string[]): Promise<string[]> {
  const bad: string[] = [];
  for (const url of urls) {
    const res = await page.goto(url);
    expect(res?.status(), url).toBeLessThan(400);
    await expect(page.locator("main").first()).toBeVisible();
    const over = await horizontalOverflow(page);
    if (over > 0) bad.push(`${url} (+${over}px)`);
  }
  return bad;
}

for (const locale of LOCALES) {
  test(`N-04: public screens at 375px have no horizontal scroll (${locale})`, async ({ page }) => {
    test.setTimeout(180_000);
    const urls = PUBLIC_PATHS.map((p) => `/${locale}${p}`);
    expect(await overflowing(page, urls)).toEqual([]);
  });
}

test("N-04: flag-on public lists (/jobs, /demand) at 375px have no horizontal scroll", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const urls = LOCALES.flatMap((l) => [`${JOBS_URL}/${l}/jobs`, `${DEMAND_URL}/${l}/demand`]);
  expect(await overflowing(page, urls)).toEqual([]);
});

for (const locale of ["ko", "vi", "ru"] as const) {
  test(`N-04: signed-in seeker screens at 375px have no horizontal scroll (${locale})`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await quickRegisterUi(page, { locale, phone: uniquePhone(), visaCode: "F-4" });
    const complete = await horizontalOverflow(page);
    expect(complete, `/${locale}/seeker/register/complete`).toBeLessThanOrEqual(0);
    const urls = SEEKER_PATHS.map((p) => `/${locale}${p}`);
    expect(await overflowing(page, urls)).toEqual([]);
  });
}
