import { expect, type Page, test } from "@playwright/test";

import {
  STAFF_PASSWORD,
  companyCountByBizRegNo,
  createSeeker,
  createStaff,
  exhaustLoginLimit,
  setLatestOtpCode,
  totpCodeAt,
  uniqueBizRegNo,
  uniqueEmail,
  uniqueIp,
  uniquePhone,
} from "./support/authDb";
import { msg } from "./support/messages";

// P1b: R-104 seeker OTP, R-118 staff password + TOTP 2FA, R-123 employer signup, R-129 (login 429).
// Every test uses its own client address so the per-IP limits of one test never affect another.
// Origin "localhost": `next start --hostname 127.0.0.1` builds middleware redirect URLs on
// "localhost" (as the next-intl redirects do), so the session cookie must live on that origin.
test.use({ baseURL: `http://localhost:${process.env.E2E_PORT ?? 3100}` });
test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": uniqueIp() });
});

async function staffPasswordLogin(page: Page, email: string) {
  await page.goto("/admin/login");
  await page.getByLabel("이메일").fill(email);
  await page.getByLabel("비밀번호").fill(STAFF_PASSWORD);
  await page.getByRole("button", { name: "로그인" }).click();
}

async function readSecret(page: Page): Promise<string> {
  const text = await page.getByTestId("totp-secret").innerText();
  return text.replace(/\s+/g, "");
}

test.describe("R-118 admin 2FA", () => {
  test("R-118: no session → /admin redirects to the Korean-only staff login", async ({ page }) => {
    const res = await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
    expect(res?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "ko");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("R-118: password only → /admin/* refused until TOTP setup; otplib code opens it", async ({
    page,
  }) => {
    const email = await createStaff("STAFF_PLACEMENT");
    await staffPasswordLogin(page, email);
    await expect(page).toHaveURL(/\/admin\/2fa\/setup$/);

    // Direct navigation to admin pages is refused while 2FA is not done.
    for (const path of ["/admin", "/admin/seekers", "/admin/2fa/verify"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/2fa\/setup$/);
    }
    await expect(page.getByTestId("admin-dashboard-placeholder")).toHaveCount(0);

    // A client-side session update cannot fake the second factor.
    const forged = await page.evaluate(async () => {
      const { csrfToken } = (await (await fetch("/api/auth/csrf")).json()) as { csrfToken: string };
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csrfToken, data: { twoFactorVerified: true, totpProof: "x.1.y" } }),
      });
      return res.status;
    });
    expect(forged).toBeLessThan(500);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/2fa\/setup$/);

    const secret = await readSecret(page);
    expect(secret).toMatch(/^[A-Z2-7]{16,}$/);
    await expect(page.getByTestId("totp-uri")).toContainText("otpauth://totp/");

    await page.getByLabel("인증 앱의 6자리 코드").fill("000000");
    await page.getByRole("button", { name: "설정 완료" }).click();
    await expect(page.getByTestId("auth-error")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/2fa\/setup$/);

    await page.getByLabel("인증 앱의 6자리 코드").fill(totpCodeAt(secret));
    await page.getByRole("button", { name: "설정 완료" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByTestId("admin-dashboard-placeholder")).toBeVisible();
    await expect(page.getByTestId("admin-actor")).toContainText("매칭 담당");

    // 2FA screens bounce back to the dashboard once verified.
    await page.goto("/admin/2fa/setup");
    await expect(page).toHaveURL(/\/admin$/);

    // Sign out → admin closed again; next sign-in asks for the code (verify, not setup).
    await page.getByRole("button", { name: "로그아웃" }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);

    await staffPasswordLogin(page, email);
    await expect(page).toHaveURL(/\/admin\/2fa\/verify$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/2fa\/verify$/);
    await expect(page.getByTestId("totp-secret")).toHaveCount(0);
    // The setup code may still be current and would be refused as a replay (P1b QA O-3), so use
    // the next time step's code (accepted within the one-step drift window).
    const nextStepCode = totpCodeAt(secret, new Date(Date.now() + 30_000));
    await page.getByLabel("인증 앱의 6자리 코드").fill(nextStepCode);
    await page.getByRole("button", { name: "확인" }).click();
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("wrong staff password shows an error and stays on the login page", async ({ page }) => {
    const email = await createStaff();
    await page.goto("/admin/login");
    await page.getByLabel("이메일").fill(email);
    await page.getByLabel("비밀번호").fill("not-the-password");
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page.getByTestId("auth-error")).toHaveText(
      "이메일 또는 비밀번호가 맞지 않습니다.",
    );
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});

test.describe("R-123 employer signup / login", () => {
  async function fillSignup(page: Page, bizRegNo: string, email: string) {
    await page.goto("/ko/employer/signup");
    const form = page.getByTestId("employer-signup-form");
    await form.locator('input[name="companyName"]').fill("이투이 테스트 제조");
    await form.locator('input[name="bizRegNo"]').fill(bizRegNo);
    await form.locator('select[name="industryCode"]').selectOption({ index: 1 });
    await form.locator('select[name="sido"]').selectOption({ index: 1 });
    await form.locator('input[name="email"]').fill(email);
    await form.locator('input[name="password"]').fill("employer-pass-123");
    await form.locator('input[name="passwordConfirm"]').fill("employer-pass-123");
    await page.getByRole("button", { name: msg("ko", "employer.signup.submit") }).click();
  }

  test("R-123: signup, then the same 사업자등록번호 is refused on a second signup", async ({
    page,
    context,
  }) => {
    const digits = uniqueBizRegNo();
    const email = uniqueEmail("e2e-employer");
    await fillSignup(page, digits, email);
    await expect(page).toHaveURL(/\/ko$/);
    expect(await companyCountByBizRegNo(digits)).toBe(1);

    await context.clearCookies();
    const dashed = `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
    await fillSignup(page, dashed, uniqueEmail("e2e-employer2"));
    await expect(page.getByTestId("auth-error")).toHaveText(msg("ko", "errors.auth.bizRegNoTaken"));
    await expect(page).toHaveURL(/\/ko\/employer\/signup$/);
    expect(await companyCountByBizRegNo(digits)).toBe(1);

    // the first account can sign in
    await page.goto("/ko/employer/login");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill("wrong-password");
    await page.getByRole("button", { name: msg("ko", "employer.login.submit") }).click();
    await expect(page.getByTestId("auth-error")).toHaveText(
      msg("ko", "errors.auth.invalidCredentials"),
    );
    await page.locator('input[name="password"]').fill("employer-pass-123");
    await page.getByRole("button", { name: msg("ko", "employer.login.submit") }).click();
    await expect(page).toHaveURL(/\/ko$/);
  });

  test("client validation shows field errors in the page language", async ({ page }) => {
    await page.goto("/en/employer/signup");
    await page.locator('input[name="bizRegNo"]').fill("12");
    await page.getByRole("button", { name: msg("en", "employer.signup.submit") }).click();
    await expect(page.getByText(msg("en", "errors.field.required")).first()).toBeVisible();
    await expect(page.getByText(msg("en", "errors.field.invalidBizRegNo"))).toBeVisible();
  });

  test("R-129: a rate-limited e-mail gets 429 from the sign-in endpoint and a message in the form", async ({
    page,
    request,
  }) => {
    const email = uniqueEmail("e2e-limited");
    const ip = uniqueIp();
    await exhaustLoginLimit(email, ip);
    const res = await request.post("/api/auth/callback/employer-password", {
      headers: { "x-forwarded-for": ip },
      form: { email, password: "whatever-password" },
    });
    expect(res.status()).toBe(429);
    expect(res.headers()["retry-after"]).toMatch(/^[0-9]+$/);
    expect(await res.json()).toEqual({
      error: { code: "RATE_LIMITED", message: "too many sign-in attempts" },
    });

    await page.goto("/ko/employer/login");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill("whatever-password");
    await page.getByRole("button", { name: msg("ko", "employer.login.submit") }).click();
    await expect(page.getByTestId("auth-error")).toHaveText(msg("ko", "errors.auth.rateLimited"));
  });
});

test.describe("R-104 seeker OTP login", () => {
  test("R-104: send code → resend locked for 60s → code signs the seeker in", async ({ page }) => {
    const phone = uniquePhone();
    await createSeeker(phone);
    const local = `0${phone.slice(3, 5)}-${phone.slice(5, 9)}-${phone.slice(9)}`;

    await page.goto("/vi/seeker/login");
    await expect(page.locator("h1")).toHaveText(msg("vi", "seeker.login.title"));
    await page.getByLabel(new RegExp(msg("vi", "seeker.login.phone.label"))).fill(local);
    await page.getByRole("button", { name: msg("vi", "seeker.login.sendCode") }).click();
    await expect(page.getByTestId("seeker-login-code")).toBeVisible();
    await expect(page.getByTestId("seeker-login-resend")).toBeDisabled();

    // R-104 server side as well: a second request within 60 seconds answers 429.
    const again = await page.request.post("/api/seeker/otp", {
      headers: { "x-forwarded-for": uniqueIp() },
      data: { phone: local },
    });
    expect(again.status()).toBe(429);
    expect(((await again.json()) as { error: { code: string } }).error.code).toBe(
      "RESEND_TOO_SOON",
    );

    await setLatestOtpCode(phone, "482913");
    const codeInput = page.getByLabel(new RegExp(msg("vi", "seeker.login.code.label")));
    await codeInput.fill("111111");
    await page.getByRole("button", { name: msg("vi", "seeker.login.submit") }).click();
    await expect(page.getByTestId("auth-error")).toHaveText(msg("vi", "errors.auth.otpInvalid"));

    await codeInput.fill("482913");
    await page.getByRole("button", { name: msg("vi", "seeker.login.submit") }).click();
    // P1c: after sign-in the seeker lands on 마이페이지 (R-113)
    await expect(page).toHaveURL(/\/vi\/seeker\/me$/);
  });

  test("an invalid phone number is rejected in the form", async ({ page }) => {
    await page.goto("/ko/seeker/login");
    await page.getByLabel(new RegExp(msg("ko", "seeker.login.phone.label"))).fill("12");
    await page.getByRole("button", { name: msg("ko", "seeker.login.sendCode") }).click();
    await expect(page.getByText(msg("ko", "errors.field.invalidPhone"))).toBeVisible();
  });
});
