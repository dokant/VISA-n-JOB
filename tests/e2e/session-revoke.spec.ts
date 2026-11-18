import { type APIResponse, type BrowserContext, type Page, expect, test } from "@playwright/test";

import { signInNewStaff } from "./support/adminDb";
import { createSeeker, uniquePhone } from "./support/authDb";
import { EMPLOYER_PASSWORD, createEmployerAccount } from "./support/employerDb";
import { msg } from "./support/messages";
import { isolate, loginUi } from "./support/seekerFlow";

// Integration QA I-1: sign-out ends the session on the server (JWT session version), not only the
// cookie. (a) a session cookie saved before sign-out and put back afterwards opens nothing;
// (b) requests still in flight at sign-out cannot bring the session back (the middleware never
// writes the session cookie). Origin "localhost" for the session cookie (same as auth.spec.ts).
test.use({ baseURL: `http://localhost:${process.env.E2E_PORT ?? 3100}` });
test.beforeEach(async ({ page }) => {
  await isolate(page);
});

const ADMIN_PAGES = [
  "/admin",
  "/admin/seekers",
  "/admin/leads",
  "/admin/companies",
  "/admin/postings",
  "/admin/matching",
  "/admin/placements",
  "/admin/visa-cases",
  "/admin/rules",
  "/admin/score-tables",
];

async function sessionCookies(context: BrowserContext) {
  return (await context.cookies()).filter((c) => c.name.includes("authjs.session-token"));
}

/** What /api/auth/session says about the browser's current cookie (Node.js check, `sv`). */
async function serverSessionUser(page: Page): Promise<unknown> {
  return page.evaluate(async () => {
    const body = (await (await fetch("/api/auth/session")).json()) as { user?: unknown } | null;
    return body?.user ?? null;
  });
}

/**
 * Seekers and employers have no sign-out button (not in the PRD); the Auth.js sign-out endpoint is
 * their sign-out path and runs the same `events.signOut` as the admin action.
 */
async function signOutViaAuthJs(page: Page) {
  const status = await page.evaluate(async () => {
    const { csrfToken } = (await (await fetch("/api/auth/csrf")).json()) as { csrfToken: string };
    const res = await fetch("/api/auth/signout", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "X-Auth-Return-Redirect": "1",
      },
      body: new URLSearchParams({ csrfToken, callbackUrl: "/ko" }),
    });
    return res.status;
  });
  expect(status).toBe(200);
}

test.describe("I-1 sign-out ends the session on the server", () => {
  test("I-1 admin: a session cookie saved before sign-out does not open /admin again", async ({
    page,
    context,
  }) => {
    await signInNewStaff(page, "ADMIN");
    const saved = await sessionCookies(context);
    expect(saved.length).toBeGreaterThan(0);
    expect(await serverSessionUser(page)).not.toBeNull();

    await page.getByRole("button", { name: "로그아웃" }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    expect(await sessionCookies(context)).toHaveLength(0);

    // Put the old cookie back (a copied cookie, or one restored by a late response).
    await context.addCookies(saved);
    for (const path of ["/admin", "/admin/seekers", "/admin/2fa/verify", "/admin/login"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login$/);
      await expect(page.getByTestId("staff-login-form")).toBeVisible();
      await expect(page.getByTestId("admin-dashboard")).toHaveCount(0);
    }
    expect(await serverSessionUser(page)).toBeNull();
  });

  test("I-1 seeker: a session cookie saved before sign-out does not open 마이페이지 again", async ({
    page,
    context,
  }) => {
    const phone = uniquePhone();
    await createSeeker(phone);
    await loginUi(page, "ko", phone);
    const saved = await sessionCookies(context);
    expect(saved.length).toBeGreaterThan(0);

    await signOutViaAuthJs(page);
    expect(await sessionCookies(context)).toHaveLength(0);
    await page.goto("/ko/seeker/me");
    await expect(page).toHaveURL(/\/ko\/seeker\/login\?next=(%2F|\/)seeker(%2F|\/)me$/);

    await context.addCookies(saved);
    await page.goto("/ko/seeker/me");
    await expect(page).toHaveURL(/\/ko\/seeker\/login\?next=(%2F|\/)seeker(%2F|\/)me$/);
    expect(await serverSessionUser(page)).toBeNull();
  });

  test("I-1 employer: a session cookie saved before sign-out does not open the request page again", async ({
    page,
    context,
  }) => {
    const { email } = await createEmployerAccount();
    await page.goto("/ko/employer/login?next=/employer/request");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(EMPLOYER_PASSWORD);
    await page.getByRole("button", { name: msg("ko", "employer.login.submit") }).click();
    await expect(page).toHaveURL(/\/ko\/employer\/request$/);
    const saved = await sessionCookies(context);
    expect(saved.length).toBeGreaterThan(0);

    await signOutViaAuthJs(page);
    expect(await sessionCookies(context)).toHaveLength(0);

    await context.addCookies(saved);
    for (const path of ["/ko/employer/request", "/ko/employer/requests"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/ko\/employer\/login\?next=/);
    }
    expect(await serverSessionUser(page)).toBeNull();
  });

  test("I-1 admin: requests in flight at sign-out never bring the session back (10 rounds)", async ({
    page,
    context,
  }) => {
    test.setTimeout(240_000);
    for (let round = 1; round <= 10; round++) {
      // A new staff member per round: each TOTP code is accepted once (P1b QA O-3).
      await signInNewStaff(page, "ADMIN");
      const saved = await sessionCookies(context);
      expect(saved.length, `round ${round}: signed in`).toBeGreaterThan(0);

      // RSC prefetches of every admin menu page, sent with the live cookie (the browser context's
      // request client shares and updates the page's cookie jar, like the router's prefetches).
      const rsc = { RSC: "1", "Next-Router-Prefetch": "1" };
      const inFlight: Promise<APIResponse | null>[] = [];
      const fire = () => {
        for (const path of ADMIN_PAGES) {
          inFlight.push(
            context.request
              .get(`${path}?_rsc=i1r${round}`, { headers: rsc, maxRedirects: 0 })
              .catch(() => null),
          );
        }
      };
      fire();
      const signOut = page.getByRole("button", { name: "로그아웃" }).click();
      fire();
      await signOut;
      fire();
      await expect(page).toHaveURL(/\/admin\/login$/);
      await Promise.all(inFlight);

      // No response put a session cookie back, and the server answers as signed out.
      expect(await sessionCookies(context), `round ${round}: cookie jar`).toHaveLength(0);
      await page.goto("/admin");
      await expect(page, `round ${round}: /admin`).toHaveURL(/\/admin\/login$/);
      await expect(page.getByTestId("admin-dashboard")).toHaveCount(0);

      // Even the cookie restored by hand stays dead.
      await context.addCookies(saved);
      await page.goto("/admin");
      await expect(page, `round ${round}: restored cookie`).toHaveURL(/\/admin\/login$/);
      await context.clearCookies();
    }
  });
});
