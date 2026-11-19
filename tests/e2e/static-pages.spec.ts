import { expect, test } from "@playwright/test";

import { LOCALES, msg } from "./support/messages";

const PAGES = ["/about", "/fees", "/privacy", "/terms"] as const;

test.describe("R-102 public pages", () => {
  for (const locale of LOCALES) {
    test(`/${locale}: about, fees, privacy, terms respond 200 with footer registration`, async ({
      page,
    }) => {
      for (const p of PAGES) {
        const res = await page.goto(`/${locale}${p}`);
        expect(res?.status(), p).toBe(200);
        await expect(page.locator("h1")).toHaveCount(1);
        const reg = page.getByTestId("footer-registration");
        await expect(reg).toContainText("제2026-3230291-14-5-00014호");
        await expect(reg).toContainText("24-SU-RG-042");
        await expect(reg).toContainText("정충교");
        await expect(page.locator(`footer a[href="/${locale}/fees"]`).first()).toBeVisible();
      }
    });

    test(`/${locale}: legal drafts carry [전문가 검토 필요] (+ Korean original, SC-08)`, async ({
      page,
    }) => {
      for (const p of ["/privacy", "/terms"]) {
        await page.goto(`/${locale}${p}`);
        const mark = page.getByTestId("expert-review");
        await expect(mark).toContainText("[전문가 검토 필요]");
        if (locale !== "ko") {
          await expect(mark).toContainText(msg(locale, "common.expertReview.label"));
          await expect(page.getByTestId("legal-document")).toContainText(
            msg("ko", `legal.${p.slice(1)}.sections.s1.title`),
          );
        }
      }
    });
  }

  test("/fees shows 구직자 이용료 없음; mobile number is never shown (Q-06)", async ({ page }) => {
    await page.goto("/ko/fees");
    await expect(page.getByTestId("no-seeker-fee")).toHaveText(msg("ko", "common.noSeekerFee"));
    for (const p of ["/ko", "/ko/about", "/ko/fees"]) {
      await page.goto(p);
      const html = await page.content();
      // The operator mobile lives only in SITE_OPERATOR_MOBILE (Q-06); no number is kept in the repo.
      expect(html).not.toMatch(/01[016-9]-\d{3,4}-\d{4}/);
      const mobile = process.env.SITE_OPERATOR_MOBILE;
      if (mobile) expect(html).not.toContain(mobile);
    }
  });

  test("no handoff placeholders in public pages (S-70)", async ({ page }) => {
    for (const p of ["/ko", "/ko/about", "/ko/fees"]) {
      await page.goto(p);
      const html = await page.content();
      expect(html).not.toMatch(
        /비전잡|000-00-00000|2026-0000호|1234-5678|올림픽로 300|visanjob\.co\.kr/,
      );
    }
  });
});

test.describe("N-04 375px: no horizontal scroll on public pages", () => {
  test.use({ viewport: { width: 375, height: 812 } });
  for (const locale of LOCALES) {
    test(`/${locale} public pages`, async ({ page }) => {
      for (const p of ["", ...PAGES, "/visa-check", "/score/e74", "/demand", "/guide/how-to-use"]) {
        await page.goto(`/${locale}${p}`);
        const { sw, cw } = await page.evaluate(() => ({
          sw: document.documentElement.scrollWidth,
          cw: document.documentElement.clientWidth,
        }));
        expect(sw, `${locale}${p}`).toBeLessThanOrEqual(cw);
      }
    });
  }
});

test.describe("S-66 navigation", () => {
  test("home nav starts transparent; other pages start solid", async ({ page }) => {
    await page.goto("/ko");
    await expect(page.getByTestId("site-nav")).toHaveAttribute("data-solid", "false");
    await page.goto("/ko/about");
    await expect(page.getByTestId("site-nav")).toHaveAttribute("data-solid", "true");
    await expect(page.locator('a[aria-current="page"]').first()).toHaveAttribute(
      "href",
      "/ko/about",
    );
  });

  test("mobile burger opens the sheet and Esc closes it", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/ko/about");
    await page.getByTestId("nav-burger").click();
    await expect(page.getByTestId("nav-drawer")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("nav-drawer")).toHaveCount(0);
    await expect(page.getByTestId("nav-burger")).toBeFocused();
  });
});
