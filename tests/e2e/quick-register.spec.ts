import { expect, test } from "@playwright/test";

import { uniquePhone } from "./support/authDb";
import { msg } from "./support/messages";
import { seekerProfileByPhone, staffTasksOf } from "./support/seekerDb";
import { isolate, quickRegisterUi } from "./support/seekerFlow";

// R-105 간편 등록, R-109 차단 (BR-08). Origin "localhost": see auth.spec.ts (session cookie).
test.use({ baseURL: `http://localhost:${process.env.E2E_PORT ?? 3100}` });
test.beforeEach(async ({ page }) => isolate(page));

test.describe("R-105 quick registration", () => {
  test("R-105: one screen → account with isQuickSignup, grade B and the 프로필 완성 notice", async ({
    page,
  }) => {
    const phone = uniquePhone();
    await page.goto("/vi/seeker/register/quick");
    await expect(page.locator("h1")).toHaveText(msg("vi", "seeker.quick.title"));
    await expect(page.getByTestId("no-seeker-fee")).toHaveText(
      msg("vi", "seeker.quick.noSeekerFee"),
    );
    await quickRegisterUi(page, { locale: "vi", phone, visaCode: "F-4" });

    const p = await seekerProfileByPhone(phone);
    expect(p).toMatchObject({
      isQuickSignup: true,
      grade: "B",
      track: "JOB_MATCH",
      visaCode: "F-4",
    });
    const tasks = await staffTasksOf(p?.id ?? "");
    expect(tasks).toContainEqual({ type: "PROFILE_COMPLETION_NOTICE", status: "DONE" });
  });

  test("R-109: B-1 / C-3 / 모름 show the consult guidance instead of the form", async ({
    page,
  }) => {
    await page.goto("/ko/seeker/register/quick");
    const select = page.getByTestId("quick-register-form").locator('select[name="visaCode"]');
    for (const code of ["B-1", "C-3", "UNKNOWN"]) {
      await select.selectOption(code);
      await expect(page.getByTestId("registration-blocked")).toBeVisible();
      await expect(page.getByTestId("blocked-consult")).toHaveAttribute(
        "href",
        /\/ko\/about#contact$/,
      );
      await expect(page.getByTestId("quick-submit")).toBeDisabled();
    }
    await select.selectOption("F-4");
    await expect(page.getByTestId("registration-blocked")).toHaveCount(0);
  });

  test("required consents are enforced in the form", async ({ page }) => {
    await page.goto("/en/seeker/register/quick");
    await page
      .getByTestId("quick-register-form")
      .locator('select[name="visaCode"]')
      .selectOption("F-4");
    await page.getByTestId("quick-submit").click();
    await expect(page.getByText(msg("en", "errors.field.consentRequired")).first()).toBeVisible();
  });
});
