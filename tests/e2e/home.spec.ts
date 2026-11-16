import { expect, test } from "@playwright/test";

import { LOCALES, msg } from "./support/messages";

// R-101: home elements in all 6 locales. Links to later-phase routes (/seeker/register/quick,
// /employer/*) are checked by href only, never followed.
test.describe("R-101 home elements", () => {
  for (const locale of LOCALES) {
    test(`/${locale} has every R-101 element`, async ({ page }) => {
      const res = await page.goto(`/${locale}`);
      expect(res?.status()).toBe(200);

      // Section order (STANDARD 3.7)
      const order = await page.evaluate(() =>
        Array.from(document.querySelectorAll("main > section[data-testid]")).map((s) =>
          s.getAttribute("data-testid"),
        ),
      );
      expect(order).toEqual([
        "home-hero",
        "home-audience",
        "home-metrics",
        "home-visa-widget",
        "home-final-cta",
      ]);

      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toBeVisible();
      // ① 대상 선택 3버튼
      for (const a of ["employer", "seeker", "agency"]) {
        await expect(page.getByTestId(`audience-card-${a}`)).toBeVisible();
      }
      // ② 비자 진단 위젯
      await expect(page.getByTestId("visa-check-form")).toBeVisible();
      // ③ 실적 지표 영역 (PC-7: no operator metrics → license cards only, no numbers)
      await expect(page.getByTestId("license-cards")).toBeVisible();
      await expect(page.getByTestId("metrics-grid")).toHaveCount(0);
      // ④ 수요 지도 미리보기: flag off → not rendered (SC-07)
      await expect(page.getByTestId("home-demand-preview")).toHaveCount(0);
      // ⑤ 수수료 링크
      await expect(page.getByTestId("fees-link")).toHaveAttribute("href", `/${locale}/fees`);
      await expect(page.getByTestId("final-fees-link")).toHaveAttribute("href", `/${locale}/fees`);
      // ⑥ 구직자 이용료 없음 (BR-10)
      await expect(page.getByTestId("no-seeker-fee")).toHaveText(msg(locale, "common.noSeekerFee"));
      // SC-06: no "지원하기"/"Apply" anywhere
      const text = await page.locator("body").innerText();
      expect(text).not.toMatch(/지원하기|바로 지원|\bApply\b/);
    });
  }
});

test.describe("audience selector (3.3)", () => {
  test("cards and tabs share one state; keyboard works", async ({ page }) => {
    await page.goto("/ko");
    const panel = page.getByTestId("audience-panel");
    await expect(panel).toHaveAttribute("data-audience", "employer");
    await page.getByTestId("audience-card-seeker").click();
    await expect(panel).toHaveAttribute("data-audience", "seeker");
    await expect(page.getByTestId("audience-card-seeker")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("audience-tab-seeker")).toHaveAttribute("aria-selected", "true");
    await page.getByTestId("audience-card-agency").focus();
    await page.keyboard.press("Enter");
    await expect(panel).toHaveAttribute("data-audience", "agency");
    await page.getByTestId("audience-tab-employer").click();
    await expect(panel).toHaveAttribute("data-audience", "employer");
  });
});

test.describe("R-126 visa widget", () => {
  test("seed state: result is YELLOW 확인 필요 with the reference disclaimer (WO15-09)", async ({
    page,
  }) => {
    await page.goto("/ko");
    const form = page.getByTestId("visa-check-form");
    await form.getByRole("button", { name: msg("ko", "visa.form.submit") }).click();
    const card = page.getByTestId("outcome-card");
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute("data-outcome", "YELLOW");
    await expect(card).toContainText(msg("ko", "visa.outcome.YELLOW"));
    await expect(card.getByTestId("reference-disclaimer")).toHaveText(
      msg("ko", "common.disclaimer.reference"),
    );
  });
});

test.describe("S-57 JavaScript disabled", () => {
  test.use({ javaScriptEnabled: false });
  test("home text and links are visible without JS; ?for= switches the panel", async ({ page }) => {
    await page.goto("/ko");
    await expect(page.locator("h1")).toBeVisible();
    for (const h of await page.locator("h2").all()) await expect(h).toBeVisible();
    await expect(page.getByTestId("audience-panel")).toBeVisible();
    await page.goto("/ko?for=seeker");
    await expect(page.getByTestId("audience-panel")).toHaveAttribute("data-audience", "seeker");
  });
});

test.describe("S-58 reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("reveal elements rest untransformed and fully opaque", async ({ page }) => {
    await page.goto("/ko");
    const styles = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".reveal")).map((el) => {
        const cs = getComputedStyle(el);
        return { transform: cs.transform, opacity: cs.opacity };
      }),
    );
    expect(styles.length).toBeGreaterThan(5);
    for (const s of styles) {
      expect(s.opacity).toBe("1");
      expect(s.transform).toBe("none");
    }
  });
});
