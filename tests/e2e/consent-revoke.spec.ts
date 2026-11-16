import { expect, test } from "@playwright/test";

import { uniquePhone } from "./support/authDb";
import { createGradeASeeker, isEligibleCandidate } from "./support/seekerDb";
import { isolate, loginUi } from "./support/seekerFlow";

// R-113 / WO15-08: 마이페이지에서 BLIND_PROFILE 철회 → 즉시 기업 후보 쿼리에서 제외.
test.use({ baseURL: `http://localhost:${process.env.E2E_PORT ?? 3100}` });
test.beforeEach(async ({ page }) => isolate(page));

test("R-113 WO15-08: revoking BLIND_PROFILE on /seeker/me removes the seeker from candidates", async ({
  page,
}) => {
  const phone = uniquePhone();
  const { seekerId } = await createGradeASeeker(phone);
  expect(await isEligibleCandidate(seekerId)).toBe(true);

  await loginUi(page, "ko", phone);
  await expect(page.getByTestId("seeker-me")).toBeVisible();
  await expect(page.getByTestId("grade-badge")).toHaveAttribute("data-grade", "A");
  const item = page.getByTestId("consent-item-BLIND_PROFILE");
  await expect(item).toHaveAttribute("data-active", "true");

  await item.getByTestId("revoke-BLIND_PROFILE").click();
  await page.getByTestId("confirm-revoke-BLIND_PROFILE").click();
  await expect(page.getByTestId("consent-item-BLIND_PROFILE")).toHaveAttribute(
    "data-active",
    "false",
  );
  expect(await isEligibleCandidate(seekerId)).toBe(false);

  // giving it again brings the seeker back
  // The page reloads after the revoke; a click that lands before hydration does nothing, so retry
  // (giving consent again is idempotent).
  await expect(async () => {
    await page.getByTestId("grant-BLIND_PROFILE").click({ timeout: 2_000 });
    await expect(page.getByTestId("consent-item-BLIND_PROFILE")).toHaveAttribute(
      "data-active",
      "true",
      { timeout: 3_000 },
    );
  }).toPass({ timeout: 20_000 });
  expect(await isEligibleCandidate(seekerId)).toBe(true);
});

test("R-113: /seeker/me, /me/stay and /me/referral need a seeker session", async ({ page }) => {
  for (const path of ["/ko/seeker/me", "/ko/seeker/me/stay", "/ko/seeker/me/referral"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/ko\/seeker\/login\?next=/);
  }
});

test("R-113: stay settings are saved", async ({ page }) => {
  const phone = uniquePhone();
  await createGradeASeeker(phone);
  await loginUi(page, "en", phone);
  await page.goto("/en/seeker/me/stay");
  const form = page.getByTestId("stay-form");
  await form.getByTestId("stay-optin").click();
  await form.getByRole("button").last().click();
  await expect(page.getByTestId("stay-saved")).toBeVisible();
  await page.goto("/en/seeker/me/referral");
  await expect(page.getByTestId("referral-code")).toHaveText(/^[A-Z0-9]{8}$/);
  await expect(page.getByTestId("referral-count")).toBeVisible();
});
