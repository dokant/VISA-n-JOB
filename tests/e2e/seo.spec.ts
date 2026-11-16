import { expect, test } from "@playwright/test";

import { LOCALES } from "./support/messages";

// R-130: sitemap.xml, robots.txt, hreflang, Organization schema, /admin and /employer/candidates
// noindex — checked on the HTTP responses.
test.describe("R-130 SEO", () => {
  test("robots.txt disallows /admin and /employer/candidates and points to the sitemap", async ({
    request,
  }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/Disallow: \/admin/);
    expect(body).toMatch(/Disallow: \/\*\/employer\/candidates/);
    expect(body).toMatch(/Sitemap: .*\/sitemap\.xml/);
  });

  test("sitemap.xml lists the public pages in 6 locales with hreflang; flag-off pages excluded", async ({
    request,
  }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const xml = await res.text();
    for (const locale of LOCALES) {
      expect(xml).toContain(`/${locale}/about</loc>`);
      expect(xml).toContain(`hreflang="${locale}"`);
    }
    expect(xml).toContain('hreflang="x-default"');
    expect(xml).not.toContain("/demand<");
    expect(xml).not.toContain("/jobs<");
    expect(xml).not.toContain("employer/candidates");
    expect(xml).not.toContain("/admin");
  });

  test("home: hreflang alternates, canonical and Organization JSON-LD (no JobPosting)", async ({
    page,
  }) => {
    await page.goto("/ko");
    for (const locale of LOCALES) {
      await expect(page.locator(`link[rel="alternate"][hreflang="${locale}"]`)).toHaveAttribute(
        "href",
        new RegExp(`/${locale}$`),
      );
    }
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/ko$/);
    const jsonld = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = jsonld.map((j) => (JSON.parse(j) as { "@type": string })["@type"]);
    expect(types).toContain("Organization");
    expect(jsonld.join("")).not.toContain("JobPosting");
    const org = JSON.parse(jsonld[types.indexOf("Organization")]) as { identifier: string[] };
    expect(org.identifier).toContain("제2026-3230291-14-5-00014호");
  });

  test("/admin is noindex (header) and not localized", async ({ request }) => {
    const res = await request.get("/admin", { maxRedirects: 0 });
    expect(res.status()).toBe(404);
    expect(res.headers()["x-robots-tag"]).toContain("noindex");
  });

  test("/employer/candidates is noindex (meta + header)", async ({ page }) => {
    const res = await page.goto("/ko/employer/candidates");
    expect(res?.status()).toBe(200);
    expect(res?.headers()["x-robots-tag"]).toContain("noindex");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("R-131 guide: reviewedBy, updatedAt, FAQPage and BreadcrumbList", async ({ page }) => {
    for (const locale of LOCALES) {
      const res = await page.goto(`/${locale}/guide/how-to-use`);
      expect(res?.status()).toBe(200);
      await expect(page.getByTestId("guide-meta")).toContainText("2026");
      const jsonld = await page.locator('script[type="application/ld+json"]').allTextContents();
      const types = jsonld.map((j) => (JSON.parse(j) as { "@type": string })["@type"]);
      expect(types).toEqual(expect.arrayContaining(["FAQPage", "BreadcrumbList"]));
    }
    const res = await page.goto("/ko/cases");
    expect(res?.status()).toBe(200);
  });
});
