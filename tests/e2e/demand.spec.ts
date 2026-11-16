import { expect, test } from "@playwright/test";

import { LOCALES, demandURL, msg } from "./support/messages";

// R-117 demand map + R-015 / SC-07 flag behaviour.
test.describe("SC-07 flag off (default)", () => {
  test("/demand is ComingSoon 200 + noindex; nav and home have no demand link/section", async ({
    page,
  }) => {
    const res = await page.goto("/ko/demand");
    expect(res?.status()).toBe(200);
    await expect(page.getByTestId("coming-soon")).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByTestId("demand-table")).toHaveCount(0);
    await page.goto("/ko");
    await expect(page.getByTestId("home-demand-preview")).toHaveCount(0);
    await expect(page.locator('a[href="/ko/demand"]')).toHaveCount(0);
  });
});

test.describe("R-117 flag on", () => {
  test.use({ baseURL: demandURL() });

  for (const locale of LOCALES) {
    test(`/${locale}/demand: notice above the data, only two buttons, masking`, async ({
      page,
    }) => {
      const res = await page.goto(`/${locale}/demand`);
      expect(res?.status()).toBe(200);
      const notice = page.getByTestId("notice-box");
      await expect(notice).toHaveText(msg(locale, "public.demand.notice"));
      const table = page.getByTestId("demand-table");
      const noticeBox = await notice.boundingBox();
      const tableBox = await table.boundingBox();
      expect(noticeBox && tableBox && noticeBox.y < tableBox.y).toBeTruthy();

      // WO §8.4: exactly two buttons, with the two allowed labels
      const buttons = page.getByTestId("demand-buttons").getByRole("button");
      await expect(buttons).toHaveCount(2);
      await expect(buttons.nth(0)).toHaveText(msg(locale, "public.demand.buttons.alert"));
      await expect(buttons.nth(1)).toHaveText(msg(locale, "public.demand.buttons.visaCheck"));
      const mainButtons = await page.locator("main").getByRole("button").allInnerTexts();
      expect(mainButtons).toHaveLength(2);
      expect(await page.locator("body").innerText()).not.toMatch(/지원하기|\bApply\b/);

      // No leads in the development database → every 시·도 is "자료 부족" (masked)
      await expect(table.locator("tbody tr").first()).toContainText(
        msg(locale, "public.demand.table.insufficient"),
      );
    });
  }

  test("home shows the demand preview with the notice above the map and two buttons", async ({
    page,
  }) => {
    await page.goto("/en");
    const preview = page.getByTestId("home-demand-preview");
    await expect(preview).toBeVisible();
    await expect(preview.getByTestId("notice-box")).toHaveText(msg("en", "public.demand.notice"));
    await expect(preview.getByTestId("demand-buttons").getByRole("button")).toHaveCount(2);
    await expect(preview.getByTestId("demand-map")).toBeVisible();
    expect(await page.locator('a[href="/en/demand"]').count()).toBeGreaterThan(0);
  });

  test("the visa-check button carries the chosen region and industry (PC-8)", async ({ page }) => {
    await page.goto("/ko/demand");
    const form = page.getByTestId("demand-actions");
    await form.locator('select[name="sido"]').selectOption("BUSAN");
    await form.locator('select[name="industryCode"]').selectOption("C");
    await form.getByRole("button").nth(1).click();
    await expect(page).toHaveURL(/\/ko\/visa-check\?sido=BUSAN&industryCode=C/);
    await expect(page.locator('select[name="sido"]')).toHaveValue("BUSAN");
  });
});
