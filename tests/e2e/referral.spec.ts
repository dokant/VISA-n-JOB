import { expect, test } from "@playwright/test";

import { uniquePhone } from "./support/authDb";
import { referralCodeOf, seekerProfileByPhone } from "./support/seekerDb";
import { isolate, quickRegisterUi } from "./support/seekerFlow";

// R-111: `?ref=코드&src=채널` → referredByCode / sourceChannel (kept in cookies until registration).
test.use({ baseURL: `http://localhost:${process.env.E2E_PORT ?? 3100}` });
test.beforeEach(async ({ page }) => isolate(page));

test("R-111: entering with ?ref and ?src stores referredByCode and sourceChannel", async ({
  page: referrerPage,
  browser,
}) => {
  const referrerPhone = uniquePhone();
  await quickRegisterUi(referrerPage, { locale: "ko", phone: referrerPhone, visaCode: "F-5" });
  const code = await referralCodeOf(referrerPhone);

  // The friend uses another browser (no session of the referrer).
  const context = await browser.newContext({
    baseURL: `http://localhost:${process.env.E2E_PORT ?? 3100}`,
    viewport: referrerPage.viewportSize() ?? undefined,
  });
  const page = await context.newPage();
  await isolate(page);

  // The parameters arrive on another page first; the cookie keeps them until registration.
  await page.goto(`/en?ref=${code}&src=QR_E2E_FAIR`);
  const phone = uniquePhone();
  await quickRegisterUi(page, { locale: "en", phone, visaCode: "H-2" });

  const p = await seekerProfileByPhone(phone);
  expect(p?.referredByCode).toBe(code);
  expect(p?.sourceChannel).toBe("QR_E2E_FAIR");
  expect(p?.referralCode).not.toBe(code);
  expect(p?.referralCode).toMatch(/^[A-Z0-9]{8}$/);
  await context.close();
});

test("R-111: the share link of the completion screen carries the code", async ({ page }) => {
  const phone = uniquePhone();
  await quickRegisterUi(page, { locale: "ko", phone, visaCode: "F-6" });
  const code = await referralCodeOf(phone);
  await expect(page.getByTestId("referral-code")).toHaveText(code);
  const wa = await page.getByTestId("share-whatsapp").getAttribute("href");
  expect(decodeURIComponent(wa ?? "")).toContain(
    `/ko/seeker/register/quick?ref=${code}&src=REFERRAL`,
  );
});
