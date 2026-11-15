import { expect, test } from "@playwright/test";

const LOCALES = ["ko", "en", "vi", "ru", "zh", "uz"] as const;
const AUTONYMS: Record<(typeof LOCALES)[number], string> = {
  ko: "한국어",
  en: "English",
  vi: "Tiếng Việt",
  ru: "Русский",
  zh: "中文",
  uz: "Oʻzbekcha",
};

test.describe("R-014 default locale", () => {
  // next-intl locale detection: Accept-Language decides; unsupported languages fall back to ko.
  test.describe("unsupported browser language", () => {
    test.use({ locale: "fr-FR" });
    test("/ redirects to the default locale /ko", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL(/\/ko$/);
      await expect(page.locator("html")).toHaveAttribute("lang", "ko");
    });
  });

  test.describe("Vietnamese browser language", () => {
    test.use({ locale: "vi-VN" });
    test("/ redirects to /vi", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL(/\/vi$/);
    });
  });
});

test.describe("R-014 locale routing", () => {
  for (const locale of LOCALES) {
    test(`/${locale} renders with html lang=${locale}`, async ({ page }) => {
      const response = await page.goto(`/${locale}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.getByTestId("locale-switcher")).toContainText(AUTONYMS[locale]);
    });
  }

  test("unknown localized path returns 404", async ({ page }) => {
    const response = await page.goto("/ko/does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  });

  test("/admin is not localized by the middleware", async ({ page }) => {
    const response = await page.goto("/admin");
    expect(new URL(page.url()).pathname).toBe("/admin");
    // Admin pages arrive in P1b; for now the path must simply not be redirected to /ko/admin.
    expect(response?.status()).toBe(404);
  });
});

test.describe("R-014 locale switcher", () => {
  test("lists all six languages by their own names and switches locale", async ({ page }) => {
    await page.goto("/ko");
    await page.getByTestId("locale-switcher").click();
    for (const locale of LOCALES) {
      await expect(page.getByTestId(`locale-option-${locale}`)).toHaveText(AUTONYMS[locale]);
    }
    await page.getByTestId("locale-option-vi").click();
    await expect(page).toHaveURL(/\/vi$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  });
});

test.describe("N-04 mobile width", () => {
  test("no horizontal scroll at the current viewport", async ({ page }) => {
    for (const locale of LOCALES) {
      await page.goto(`/${locale}`);
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth, locale).toBeLessThanOrEqual(clientWidth);
    }
  });
});
