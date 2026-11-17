import { expect, type Page, test } from "@playwright/test";

import { uniquePhone } from "./support/authDb";
import { candidatesURL, createCandidateEmployer, loginEmployer } from "./support/candidatesDb";
import { isolate, quickRegisterUi } from "./support/seekerFlow";

// N-04 일괄 점검 (P2e 작업 3): the main public and seeker screens at 375px have no horizontal scroll
// and cut off no interactive element (QA P2e D-3: `overflow-x: clip` hides overflow from scrollWidth),
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

/**
 * Document width past the viewport. `html` / `body` have `overflow-x: clip`, which hides content
 * overflow from scrollWidth (QA P2e run 2 O-1: ru /employer/contract was 26px wider than 375px,
 * every control still inside the viewport but the cards cut off on the right). The clip is lifted
 * for the measurement (inline style, restored right after), so any content wider than the viewport
 * counts; containers that clip or scroll on their own are unaffected.
 */
async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const saved = [root.style.overflowX, body.style.overflowX];
    root.style.overflowX = "visible";
    body.style.overflowX = "visible";
    const over = root.scrollWidth - root.clientWidth;
    root.style.overflowX = saved[0];
    body.style.overflowX = saved[1];
    return over;
  });
}

/**
 * Visible interactive elements cut off by the 375px viewport (QA P2e D-3). `html` / `body` have
 * `overflow-x: clip`, so the document never scrolls sideways even when content does not fit and the
 * scrollWidth check alone cannot see it. Each visible link, button, tab, form control or
 * `role=button` must lie inside [0, viewport width] unless it sits in a container that scrolls
 * sideways on purpose (overflow-x auto / scroll, e.g. the admin-style tables). Visually hidden
 * elements (sr-only, 1px boxes) and elements inside `aria-hidden` / `inert` subtrees are skipped.
 * Returns "tag "text" [left,right]" per offender.
 */
async function clippedInteractive(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const selector =
      'a[href], button, [role="tab"], [role="button"], input:not([type="hidden"]), select, textarea, summary';
    const scrollsSideways = (el: Element): boolean => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const ox = getComputedStyle(p).overflowX;
        if ((ox === "auto" || ox === "scroll") && p.scrollWidth > p.clientWidth) return true;
      }
      return false;
    };
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll(selector))) {
      if (el.closest('[aria-hidden="true"], [inert]')) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1) continue;
      if (r.left >= -0.5 && r.right <= width + 0.5) continue;
      if (scrollsSideways(el)) continue;
      const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
      out.push(
        `${el.tagName.toLowerCase()} "${text}" [${Math.round(r.left)},${Math.round(r.right)}]`,
      );
    }
    return out;
  });
}

/**
 * Opens each path and collects the ones that scroll sideways or cut off an interactive element
 * (all reported at once).
 */
async function overflowing(page: Page, urls: string[]): Promise<string[]> {
  const bad: string[] = [];
  for (const url of urls) {
    const res = await page.goto(url);
    expect(res?.status(), url).toBeLessThan(400);
    await expect(page.locator("main").first()).toBeVisible();
    const over = await horizontalOverflow(page);
    if (over > 0) bad.push(`${url} (+${over}px)`);
    for (const el of await clippedInteractive(page)) bad.push(`${url} clipped ${el}`);
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
    expect(await clippedInteractive(page), `/${locale}/seeker/register/complete`).toEqual([]);
    const urls = SEEKER_PATHS.map((p) => `/${locale}${p}`);
    expect(await overflowing(page, urls)).toEqual([]);
  });
}

/**
 * Tab labels wrap between words only (STANDARD v2.23 3.1 tabs, P2e R2-1). For every `role=tab` the
 * line of each character is read from a per-character Range; all characters of one
 * whitespace-separated word must sit on the same line ("Companie/s" fails). Also returns tabs that
 * leave the tab list or the viewport, are under 44×44, or whose label overflows the tab.
 */
async function tabProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const width = document.documentElement.clientWidth;
    for (const tab of Array.from(document.querySelectorAll<HTMLElement>('[role="tab"]'))) {
      const label = (tab.textContent ?? "").trim();
      const r = tab.getBoundingClientRect();
      const list = tab.closest('[role="tablist"]')?.getBoundingClientRect();
      if (r.height < 44 || r.width < 44)
        out.push(`"${label}" ${Math.round(r.width)}x${Math.round(r.height)}`);
      if (r.left < -0.5 || r.right > width + 0.5)
        out.push(`"${label}" outside viewport [${Math.round(r.left)},${Math.round(r.right)}]`);
      if (list && (r.left < list.left - 0.5 || r.right > list.right + 0.5))
        out.push(`"${label}" outside its tab list`);
      if (tab.scrollWidth > tab.clientWidth + 1) out.push(`"${label}" label overflows the tab`);
      // line top of each non-space character, in text order
      const chars: Array<{ ch: string; top: number }> = [];
      const walker = document.createTreeWalker(tab, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const text = n.textContent ?? "";
        for (let i = 0; i < text.length; i++) {
          if (/\s/.test(text[i])) {
            chars.push({ ch: " ", top: NaN });
            continue;
          }
          const range = document.createRange();
          range.setStart(n, i);
          range.setEnd(n, i + 1);
          const rect = range.getClientRects()[0];
          if (rect) chars.push({ ch: text[i], top: rect.top });
        }
      }
      let word: Array<{ ch: string; top: number }> = [];
      const flush = () => {
        const tops = new Set(word.map((c) => Math.round(c.top)));
        if (tops.size > 1) {
          const lines = [...tops].map((t) =>
            word
              .filter((c) => Math.round(c.top) === t)
              .map((c) => c.ch)
              .join(""),
          );
          out.push(`"${label}" word split: ${lines.join(" / ")}`);
        }
        word = [];
      };
      for (const c of chars) {
        if (c.ch === " ") flush();
        else word.push(c);
      }
      flush();
    }
    return out;
  });
}

test("N-04 / R2-1: home audience tabs at 375px wrap between words only, 44px, inside the track", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const bad: string[] = [];
  for (const locale of LOCALES) {
    await page.goto(`/${locale}`);
    const tabs = page.getByRole("tab");
    await expect(tabs).toHaveCount(3);
    await tabs.first().scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    for (const p of await tabProblems(page)) bad.push(`${locale} ${p}`);
  }
  expect(bad).toEqual([]);
});

/**
 * Signed-in employer screens (QA P2e run 2 O-1: ru /employer/contract with the candidates flag on
 * was 26px wider than 375px). One verified + contracted employer: request, candidates, contract,
 * requests on the FEATURE_EMPLOYER_CANDIDATES server, and request, requests, contract on the default
 * server (flag off). One employer without a contract: the contract form. Same localhost cookie.
 */
test.describe("N-04: signed-in employer screens at 375px", () => {
  test.use({ baseURL: candidatesURL() });

  for (const locale of LOCALES) {
    test(`employer screens have no horizontal scroll or cut-off control (${locale})`, async ({
      page,
      context,
    }) => {
      test.setTimeout(180_000);
      const signed = await createCandidateEmployer({ verified: true, contracted: true });
      await loginEmployer(page, signed.email, "/employer/contract");
      const urls = [
        ...[
          "/employer/request",
          "/employer/candidates",
          "/employer/contract",
          "/employer/requests",
        ].map((p) => `${candidatesURL()}/${locale}${p}`),
        ...["/employer/request", "/employer/requests", "/employer/contract"].map(
          (p) => `${DEFAULT_URL}/${locale}${p}`,
        ),
      ];
      const bad = await overflowing(page, urls);
      await page.goto(`${candidatesURL()}/${locale}/employer/contract`);
      await expect(page.getByTestId("contract-signed")).toBeVisible();

      await context.clearCookies();
      const unsigned = await createCandidateEmployer({ verified: false, contracted: false });
      await loginEmployer(page, unsigned.email, "/employer/contract");
      bad.push(...(await overflowing(page, [`${candidatesURL()}/${locale}/employer/contract`])));
      expect(bad).toEqual([]);
    });
  }
});
