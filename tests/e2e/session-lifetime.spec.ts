import { type BrowserContext, type Page, expect, test } from "@playwright/test";
import { decode, encode } from "next-auth/jwt";

import { SESSION_MAX_AGE_SEC, STAFF_SESSION_MAX_AGE_SEC } from "@/config/limits";

import { signInNewStaff } from "./support/adminDb";
import { createSeeker, uniquePhone } from "./support/authDb";
import { EMPLOYER_PASSWORD, createEmployerAccount } from "./support/employerDb";
import { msg } from "./support/messages";
import { isolate, loginUi } from "./support/seekerFlow";

// Integration QA I-1 / Q-29 (STANDARD 4.11): every session ends at `authTime` + the role's
// lifetime (staff STAFF_SESSION_MAX_AGE_SEC, seekers and employers SESSION_MAX_AGE_SEC). Auth.js
// re-signs the cookie with a later JWT `exp` on every GET /api/auth/session; the server still ends
// the session on time. The test moves `authTime` of the real session cookie back (re-encrypted
// with the server's AUTH_SECRET, read from .env by support/authDb) so the lifetime runs out a few
// seconds into the test. Origin "localhost" for the session cookie (same as auth.spec.ts).
test.use({ baseURL: `http://localhost:${process.env.E2E_PORT ?? 3100}` });
test.beforeEach(async ({ page }) => {
  await isolate(page);
});

/** Seconds of lifetime left after the cookie is rewritten. */
const LEFT_SEC = 8;

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set (.env)");
  return value;
}

async function sessionCookie(context: BrowserContext) {
  const cookies = (await context.cookies()).filter((c) => c.name.includes("authjs.session-token"));
  expect(cookies, "one unchunked session cookie").toHaveLength(1);
  return cookies[0];
}

async function claimsOf(context: BrowserContext) {
  const cookie = await sessionCookie(context);
  const claims = await decode({ token: cookie.value, secret: secret(), salt: cookie.name });
  expect(claims).not.toBeNull();
  return claims!;
}

/** Rewrites the browser's session cookie with the given `authTime` (other claims unchanged). */
async function shiftAuthTime(context: BrowserContext, authTime: number) {
  const cookie = await sessionCookie(context);
  const claims = await claimsOf(context);
  const value = await encode({
    token: { ...claims, authTime },
    secret: secret(),
    salt: cookie.name,
    // Same JWT `exp` window as the server (authConfig session.maxAge), not encode's 30-day default.
    maxAge: SESSION_MAX_AGE_SEC,
  });
  await context.addCookies([{ ...cookie, value }]);
}

async function serverSessionUser(page: Page): Promise<unknown> {
  return page.evaluate(async () => {
    const body = (await (await fetch("/api/auth/session")).json()) as { user?: unknown } | null;
    return body?.user ?? null;
  });
}

/**
 * Leaves `LEFT_SEC` of lifetime, reads the session repeatedly (each read re-signs the cookie with a
 * later `exp`, `authTime` unchanged), then waits past `authTime + maxAge`: the server answers as
 * signed out.
 */
async function expectNoSlidingExpiry(page: Page, context: BrowserContext, maxAgeSec: number) {
  const authTime = Math.floor(Date.now() / 1000) - maxAgeSec + LEFT_SEC;
  await shiftAuthTime(context, authTime);
  const before = await claimsOf(context);

  for (let i = 0; i < 4; i++) {
    expect(await serverSessionUser(page), `read ${i + 1} inside the lifetime`).not.toBeNull();
  }
  const reissued = await claimsOf(context);
  expect(reissued.authTime).toBe(authTime);
  expect(reissued.sub).toBe(before.sub);
  expect(Number(reissued.exp)).toBeGreaterThanOrEqual(Number(before.exp));

  const endMs = (authTime + maxAgeSec + 1) * 1000 + 500;
  await page.waitForTimeout(Math.max(0, endMs - Date.now()));
  expect(await serverSessionUser(page), "after authTime + lifetime").toBeNull();
}

test.describe("Q-29 absolute session lifetime: /api/auth/session does not extend it", () => {
  test("R-104 I-1 seeker: SESSION_MAX_AGE_SEC from sign-in, then 마이페이지 needs a new sign-in", async ({
    page,
    context,
  }) => {
    const phone = uniquePhone();
    await createSeeker(phone);
    await loginUi(page, "ko", phone);
    await expectNoSlidingExpiry(page, context, SESSION_MAX_AGE_SEC);

    await page.goto("/ko/seeker/me");
    await expect(page).toHaveURL(/\/ko\/seeker\/login\?next=(%2F|\/)seeker(%2F|\/)me$/);
  });

  test("R-123 I-1 employer: SESSION_MAX_AGE_SEC from sign-in, then the request page needs a new sign-in", async ({
    page,
    context,
  }) => {
    const { email } = await createEmployerAccount();
    await page.goto("/ko/employer/login?next=/employer/request");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(EMPLOYER_PASSWORD);
    await page.getByRole("button", { name: msg("ko", "employer.login.submit") }).click();
    await expect(page).toHaveURL(/\/ko\/employer\/request$/);
    await expectNoSlidingExpiry(page, context, SESSION_MAX_AGE_SEC);

    await page.goto("/ko/employer/request");
    await expect(page).toHaveURL(/\/ko\/employer\/login\?next=/);
  });

  test("R-118 I-1 admin: STAFF_SESSION_MAX_AGE_SEC from sign-in, then /admin needs a new sign-in", async ({
    page,
    context,
  }) => {
    await signInNewStaff(page, "ADMIN");
    await expectNoSlidingExpiry(page, context, STAFF_SESSION_MAX_AGE_SEC);

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByTestId("staff-login-form")).toBeVisible();
    await expect(page.getByTestId("admin-dashboard")).toHaveCount(0);
  });

  test("R-104 I-1 seeker: a cookie already past its lifetime is refused at once", async ({
    page,
    context,
  }) => {
    const phone = uniquePhone();
    await createSeeker(phone);
    await loginUi(page, "ko", phone);
    await shiftAuthTime(context, Math.floor(Date.now() / 1000) - SESSION_MAX_AGE_SEC - 60);
    expect(await serverSessionUser(page)).toBeNull();
    await page.goto("/ko/seeker/me");
    await expect(page).toHaveURL(/\/ko\/seeker\/login\?next=/);
  });
});
