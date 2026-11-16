import path from "node:path";

import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { uniqueIp, uniquePhone } from "./support/authDb";
import { msg } from "./support/messages";
import { ageOtpChallenges, monthFromNow, seekerProfileByPhone } from "./support/seekerDb";
import { chip, isolate, loginUi, verifyPhone } from "./support/seekerFlow";

// R-106 정식 위저드 / R-107 자동 저장·재진입: Step 3까지 작성 → 새 세션 재로그인 → Step 4에서 재개,
// 입력값 유지. P1C_SHOTS=<dir> saves 375px screenshots of each screen (QA evidence, N-04).
test.use({ baseURL: `http://localhost:${process.env.E2E_PORT ?? 3100}` });
test.beforeEach(async ({ page }) => isolate(page));

const L = "ko";
const t = (key: string) => msg(L, `seeker.register.${key}`);

async function shot(page: Page, info: TestInfo, name: string) {
  const dir = process.env.P1C_SHOTS;
  if (!dir || info.project.name !== "mobile-375") return;
  await page.screenshot({ path: path.join(dir, `p1c_${name}.png`), fullPage: true });
}

async function next(page: Page, expected: RegExp) {
  await page.getByTestId("wizard-next").click();
  await expect(page).toHaveURL(expected);
}

test("R-106 R-107: Step 0~3 saved → new session → resumes at Step 4 with the answers kept", async ({
  page,
  browser,
}, info) => {
  const phone = uniquePhone();

  // Step 0 — account + sign-in
  await page.goto(`/${L}/seeker/register`);
  await expect(page.getByTestId("wizard-progress-count")).toHaveText("0/7");
  await expect(page.getByTestId("no-seeker-fee")).toHaveText(t("common.noSeekerFee"));
  await verifyPhone(page, L, phone);
  await shot(page, info, "step0");
  await page.getByTestId("wizard-next").click();
  await expect(page.getByTestId("wizard-step-1")).toBeVisible();
  await expect(page.getByTestId("wizard-progress-count")).toHaveText("1/7");

  // Step 1 — 기본 정보 (field icons + summary, SC-04)
  const s1 = page.getByTestId("wizard-step-1");
  await s1
    .getByLabel(new RegExp(t("step1.legalName.label").replace(/[()]/g, ".")))
    .fill("TRAN THI B");
  await s1.locator('select[name="nationality"]').selectOption("VN");
  await s1.locator('select[name="sido"]').selectOption({ index: 1 });
  await expect(s1.locator("[data-disclosure=blind]").first()).toBeVisible();
  await expect(s1.getByTestId("disclosure-summary")).toContainText(t("disclosure.blind"));
  await expect(s1.getByTestId("disclosure-summary")).toContainText(t("disclosure.private"));
  await shot(page, info, "step1");
  await next(page, /step=2$/);

  // Step 2 — 체류자격
  const s2 = page.getByTestId("wizard-step-2");
  await s2.getByTestId("visa-select").selectOption("E-7");
  await expect(s2.getByTestId("visa-selected")).toContainText("E-7");
  await chip(page, t("step2.visaSubType.label"), "E-7-4").click();
  const exp = monthFromNow(20);
  await s2.locator('select[name="stayExpiry-year"]').selectOption(exp.year);
  await s2.locator('select[name="stayExpiry-month"]').selectOption(exp.month);
  await chip(page, t("step2.hasArc.label"), t("common.yes")).click();
  await s2.getByRole("checkbox").click();
  await shot(page, info, "step2");
  await next(page, /step=3&sub=a$/);

  // Step 3a / 3b (SC-01 sub screens)
  await chip(
    page,
    t("step3.educationLevel.label"),
    t("step3.educationLevel.option.BACHELOR"),
  ).click();
  await page
    .getByTestId("wizard-step-3a")
    .getByLabel(new RegExp(`^${t("step3.major.label")}`))
    .fill("Mechanical");
  await shot(page, info, "step3a");
  await next(page, /step=3&sub=b$/);
  await chip(page, t("step3.topikLevel.label"), t("step3.topikLevel.option.3")).click();
  await chip(page, t("step3.kiipStage.label"), t("step3.kiipStage.option.0")).click();
  await chip(page, t("step3.koreanSpeaking.label"), t("step3.koreanSpeaking.option.3")).click();
  await shot(page, info, "step3b");
  await next(page, /step=4$/);
  await expect(page.getByTestId("wizard-step-4")).toBeVisible();
  await shot(page, info, "step4");

  const saved = await seekerProfileByPhone(phone);
  expect(saved).toMatchObject({
    completedStep: 3,
    visaCode: "E-7",
    visaSubType: "E-7-4",
    track: "JOB_MATCH",
    needsVisaReview: true,
    educationLevel: "BACHELOR",
    topikLevel: 3,
  });

  // New session (later): sign in again → 마이페이지 → continue → Step 4
  await ageOtpChallenges(phone);
  const context = await browser.newContext({
    baseURL: `http://localhost:${process.env.E2E_PORT ?? 3100}`,
    extraHTTPHeaders: { "x-forwarded-for": uniqueIp() },
    viewport: page.viewportSize() ?? undefined,
  });
  const fresh = await context.newPage();
  await loginUi(fresh, L, phone);
  await expect(fresh.getByTestId("seeker-progress-text")).toHaveText(
    msg(L, "seeker.me.progressCount").replace("{total}", "7").replace("{step}", "3"),
  );
  await fresh.getByTestId("continue-registration").click();
  await expect(fresh.getByTestId("wizard-screen")).toHaveAttribute("data-step", "4");
  await expect(fresh.getByTestId("wizard-progress-count")).toHaveText("4/7");
  await expect(fresh.getByTestId("wizard-saved")).toBeVisible();

  // 입력값 유지: earlier screens show the saved answers
  await fresh.goto(`/${L}/seeker/register?step=1`);
  await expect(fresh.locator('input[name="legalName"]')).toHaveValue("TRAN THI B");
  await expect(fresh.locator('select[name="nationality"]')).toHaveValue("VN");
  await fresh.goto(`/${L}/seeker/register?step=2`);
  await expect(fresh.getByTestId("visa-select")).toHaveValue("E-7");
  await expect(fresh.locator('select[name="stayExpiry-year"]')).toHaveValue(exp.year);
  // a later step than the resume point cannot be opened directly
  await fresh.goto(`/${L}/seeker/register?step=6`);
  await expect(fresh.getByTestId("wizard-screen")).toHaveAttribute("data-step", "4");
  await context.close();
});

test("R-106: Step 4~7 finish the registration (E-9 → no blind consent needed)", async ({
  page,
}, info) => {
  const phone = uniquePhone();
  await page.goto(`/${L}/seeker/register`);
  await verifyPhone(page, L, phone);
  await page.getByTestId("wizard-next").click();
  const s1 = page.getByTestId("wizard-step-1");
  await expect(s1).toBeVisible();
  await s1.getByLabel(new RegExp(t("step1.legalName.label").replace(/[()]/g, "."))).fill("ALIEV B");
  await s1.locator('select[name="nationality"]').selectOption("UZ");
  await s1.locator('select[name="sido"]').selectOption({ index: 2 });
  await next(page, /step=2$/);
  await page.getByTestId("visa-select").selectOption("E-9");
  const exp = monthFromNow(30);
  await page.locator('select[name="stayExpiry-year"]').selectOption(exp.year);
  await page.locator('select[name="stayExpiry-month"]').selectOption(exp.month);
  await chip(page, t("step2.hasArc.label"), t("common.yes")).click();
  await page.getByTestId("wizard-step-2").getByRole("checkbox").click();
  await next(page, /step=3&sub=a$/);
  await chip(
    page,
    t("step3.educationLevel.label"),
    t("step3.educationLevel.option.HIGH_SCHOOL"),
  ).click();
  await next(page, /sub=b$/);
  await chip(page, t("step3.topikLevel.label"), t("step3.topikLevel.option.2")).click();
  await chip(page, t("step3.kiipStage.label"), t("step3.kiipStage.option.1")).click();
  await chip(page, t("step3.koreanSpeaking.label"), t("step3.koreanSpeaking.option.2")).click();
  await next(page, /step=4$/);
  await page.getByTestId("add-experience").click();
  const row = page.getByTestId("experience-row");
  await row.locator("select").nth(0).selectOption("UZ");
  await row.locator("select").nth(1).selectOption({ index: 1 });
  await row.locator("select").nth(2).selectOption("WELDING");
  await row.locator('input[name="experiences.0.months"]').fill("18");
  await next(page, /step=5&sub=a$/);
  await chip(
    page,
    t("step5.jobSearchStatus.label"),
    t("step5.jobSearchStatus.option.IMMEDIATE"),
  ).click();
  await page
    .getByRole("group", { name: new RegExp(t("step5.desiredIndustries.label")) })
    .locator("button")
    .first()
    .click();
  await page.getByRole("button", { name: t("step5.anyRegion"), exact: true }).click();
  await shot(page, info, "step5a");
  await next(page, /sub=b$/);
  await chip(page, t("step5.needDormitory.label"), t("common.yes")).click();
  await chip(page, t("step5.shiftOk.label"), t("step5.shiftOk.option.UNKNOWN")).click();
  await shot(page, info, "step5b");
  await next(page, /step=6$/);
  await shot(page, info, "step6");
  await next(page, /step=7$/);
  await expect(page.getByTestId("consent-body-PRIVACY_REQUIRED")).toBeAttached();
  await page.getByTestId("consent-PRIVACY_REQUIRED").getByRole("checkbox").click();
  await page.getByTestId("consent-NOTICE").getByRole("checkbox").click();
  await shot(page, info, "step7");
  await page.getByTestId("wizard-next").click();
  await expect(page).toHaveURL(/\/ko\/seeker\/register\/complete$/);
  await shot(page, info, "complete");
  const p = await seekerProfileByPhone(phone);
  expect(p).toMatchObject({
    completedStep: 7,
    track: "FUTURE_POOL",
    grade: "B",
    shiftOk: "UNKNOWN",
  });
});

test("R-109: a non-registrable visa in Step 2 shows the consult guidance", async ({ page }) => {
  const phone = uniquePhone();
  await page.goto(`/${L}/seeker/register`);
  await verifyPhone(page, L, phone);
  await page.getByTestId("wizard-next").click();
  const s1 = page.getByTestId("wizard-step-1");
  await expect(s1).toBeVisible();
  await s1.getByLabel(new RegExp(t("step1.legalName.label").replace(/[()]/g, "."))).fill("X Y");
  await s1.locator('select[name="nationality"]').selectOption("PH");
  await s1.locator('select[name="sido"]').selectOption({ index: 1 });
  await next(page, /step=2$/);
  await page.getByTestId("visa-select").selectOption("C-3");
  await expect(page.getByTestId("registration-blocked")).toBeVisible();
  await expect(page.getByTestId("wizard-next")).toBeDisabled();
});
