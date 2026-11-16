import { expect, test } from "@playwright/test";

import { LOCALES, msg } from "./support/messages";

// R-127: seed state (SAMPLE score table is DRAFT) → "준비 중" + 상담 신청.
test.describe("R-127 E-7-4 score calculator", () => {
  for (const locale of LOCALES) {
    test(`/${locale}/score/e74 shows coming soon`, async ({ page }) => {
      const res = await page.goto(`/${locale}/score/e74`);
      expect(res?.status()).toBe(200);
      const box = page.getByTestId("coming-soon");
      await expect(box).toContainText(msg(locale, "public.score.comingSoon.title"));
      await expect(box.getByRole("link")).toHaveText(msg(locale, "common.consult"));
      await expect(page.getByTestId("score-form")).toHaveCount(0);
    });
  }
});

// R-126: /visa-check with a query renders the result on the server (works without JS too).
test.describe("R-126 /visa-check", () => {
  test.use({ javaScriptEnabled: false });
  test("query result shows OutcomeCard with the reference disclaimer", async ({ page }) => {
    const first = await (async () => {
      await page.goto("/ko/visa-check");
      return page.locator('select[name="visaCode"] option').first().getAttribute("value");
    })();
    await page.goto(`/ko/visa-check?visaCode=${encodeURIComponent(first ?? "")}`);
    const card = page.getByTestId("outcome-card");
    await expect(card).toHaveAttribute("data-outcome", "YELLOW");
    await expect(card.getByTestId("reference-disclaimer")).toHaveText(
      msg("ko", "common.disclaimer.reference"),
    );
  });
});
