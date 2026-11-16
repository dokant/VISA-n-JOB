import path from "node:path";

import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { uniquePhone } from "./support/authDb";
import { msg } from "./support/messages";
import { createWizardSeeker } from "./support/seekerDb";
import { isolate, loginUi, verifyPhone } from "./support/seekerFlow";

// STANDARD 3.3 / Q-10 (P1c run 3, D-2·R2-2·R2-3): keyboard focus is never hidden under the sticky
// bottom bar, required checkboxes receive the "first error field" focus, 등록 불가 비자 rows show
// no code. P1C_SHOTS=<dir> saves 375px screenshots (QA evidence).
test.use({ baseURL: `http://localhost:${process.env.E2E_PORT ?? 3100}` });
test.beforeEach(async ({ page }) => isolate(page));

const L = "ko";
const t = (key: string) => msg(L, `seeker.register.${key}`);

async function shot(page: Page, info: TestInfo, name: string) {
  const dir = process.env.P1C_SHOTS;
  if (!dir || info.project.name !== "mobile-375") return;
  await page.screenshot({ path: path.join(dir, `p1c_r3_${name}.png`) });
}

/** How far (px) the focused element reaches below the top of the sticky bar; ≤ 0 = not hidden. */
async function focusOverlap(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    const bar = document.querySelector("[data-sticky-bottom-bar]");
    const el = document.activeElement;
    if (!bar || !el || el === document.body || bar.contains(el)) return null;
    if (!el.closest("form")) return null;
    return el.getBoundingClientRect().bottom - bar.getBoundingClientRect().top;
  });
}

async function tabThroughForm(page: Page) {
  await page.getByRole("heading", { level: 1 }).click();
  let checked = 0;
  for (let i = 0; i < 90; i += 1) {
    await page.keyboard.press("Tab");
    const inBar = await page.evaluate(() =>
      Boolean(document.querySelector("[data-sticky-bottom-bar]")?.contains(document.activeElement)),
    );
    if (inBar) break;
    const first = await focusOverlap(page);
    if (first === null) continue;
    checked += 1;
    // focus scrolling may be smooth: wait until the element settles above the bar
    await expect
      .poll(async () => (await focusOverlap(page)) ?? 0, { timeout: 2_000 })
      .toBeLessThanOrEqual(0.5);
  }
  expect(checked).toBeGreaterThan(5);
}

test("D-2: Tab focus on Step 5a and 3b stays above the sticky bottom bar", async ({ page }) => {
  const phone = uniquePhone();
  await createWizardSeeker(phone, "6");
  await loginUi(page, L, phone);

  await page.goto(`/${L}/seeker/register?step=5&sub=a`);
  await expect(page.getByTestId("wizard-screen")).toHaveAttribute("data-step", "5a");
  await tabThroughForm(page);

  await page.goto(`/${L}/seeker/register?step=3&sub=b`);
  await expect(page.getByTestId("wizard-screen")).toHaveAttribute("data-step", "3b");
  await tabThroughForm(page);
});

test("R2-2: empty required consent on Step 7 → focus moves to its checkbox", async ({ page }) => {
  const phone = uniquePhone();
  await createWizardSeeker(phone, "6");
  await loginUi(page, L, phone);
  await page.goto(`/${L}/seeker/register?step=7`);
  // the quick signup already agreed: untick the first required consent, move focus away, submit
  const box = page.getByTestId("consent-PRIVACY_REQUIRED").getByRole("checkbox");
  await expect(box).toBeChecked();
  await box.click();
  await expect(box).not.toBeChecked();
  await page.getByRole("heading", { level: 1 }).click();
  await page.getByTestId("wizard-next").click();
  await expect(box).toBeFocused();
  await expect(page).toHaveURL(/step=7$/);
});

test("R2-2 · 6: Step 2 confirm checkbox gets focus; 등록 불가 비자 keeps the button label", async ({
  page,
}, info) => {
  const phone = uniquePhone();
  await page.goto(`/${L}/seeker/register`);
  await verifyPhone(page, L, phone);
  await page.getByTestId("wizard-next").click();
  const s1 = page.getByTestId("wizard-step-1");
  await s1.getByLabel(new RegExp(t("step1.legalName.label").replace(/[()]/g, "."))).fill("LE C");
  await s1.locator('select[name="nationality"]').selectOption("VN");
  await s1.locator('select[name="sido"]').selectOption({ index: 1 });
  await page.getByTestId("wizard-next").click();
  await expect(page).toHaveURL(/step=2$/);

  const s2 = page.getByTestId("wizard-step-2");
  await s2.getByTestId("visa-select").selectOption("F-4");
  await s2.locator('select[name="stayExpiry-year"]').selectOption({ index: 2 });
  await s2.locator('select[name="stayExpiry-month"]').selectOption({ index: 1 });
  await s2
    .getByRole("radiogroup", { name: new RegExp(t("step2.hasArc.label")) })
    .getByRole("radio", { name: t("common.yes"), exact: true })
    .click();
  await page.getByTestId("wizard-next").click();
  await expect(s2.getByRole("checkbox")).toBeFocused();

  await s2.getByTestId("visa-select").selectOption("UNKNOWN");
  await expect(page.getByTestId("registration-blocked")).toBeVisible();
  const nextButton = page.getByTestId("wizard-next");
  await expect(nextButton).toBeDisabled();
  await expect(nextButton).toHaveText(t("common.next"));
  await expect(nextButton).not.toContainText(t("common.saving"));
  await nextButton.scrollIntoViewIfNeeded();
  await shot(page, info, "step2_blocked");
});

test("R2-3: /visa-check shows 기타·없음·모름 by name only (option and result)", async ({
  page,
}, info) => {
  await page.goto(`/${L}/visa-check?visaCode=UNKNOWN`);
  const option = page.locator('select[name="visaCode"] option[value="UNKNOWN"]');
  await expect(option).toHaveText(msg(L, "visaType.unknown.name"));
  await expect(page.locator('select[name="visaCode"] option[value="F-4"]')).toHaveText(
    `F-4 ${msg(L, "visaType.f4.name")}`,
  );
  const card = page.getByTestId("outcome-card");
  await expect(card).toBeVisible();
  await expect(card).not.toContainText("UNKNOWN");
  await expect(card).toContainText(msg(L, "visaType.unknown.name"));
  await card.scrollIntoViewIfNeeded();
  await shot(page, info, "visa_check_unknown");
});
