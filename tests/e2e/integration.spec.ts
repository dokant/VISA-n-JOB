import { type Browser, expect, type Page, test } from "@playwright/test";

import { toBlindPublicId } from "@/lib/serializers/blindSeeker";

import { auditFor, signInNewStaff } from "./support/adminDb";
import { uniqueIp, uniquePhone } from "./support/authDb";
import { candidatesURL, createCandidateEmployer, loginEmployer } from "./support/candidatesDb";
import {
  auditActionsOf,
  interviewRequestsOf,
  ledgerRowsOf,
  tagForCandidateList,
} from "./support/integrationDb";
import { msg } from "./support/messages";
import { isEligibleCandidate, monthFromNow, seekerProfileByPhone } from "./support/seekerDb";
import { chip, isolate, quickRegisterUi, waitForHydration } from "./support/seekerFlow";

// R-217 / WO §15-11 통합 시나리오 (P2e 작업 1): 간편 등록 → 프로필 완성(위저드) → 관리자 A 승격(2FA
// 포함) → 기업(검증·계약 픽스처) 후보 노출 → 면접 요청 → 관리자 추천 → Recommendation 원장 행.
// Every step goes through the screens of the production build. The only fixtures are the employer
// account (C-2/PC-2: verified + contract) and a unique filter tag on the seeker, so the candidate list
// shows exactly this seeker whatever earlier runs left in the shared development database.
const DEFAULT_URL = `http://localhost:${process.env.E2E_PORT ?? 3100}`;
test.use({ baseURL: DEFAULT_URL });
test.beforeEach(async ({ page }) => isolate(page));

const L = "ko";
const t = (key: string) => msg(L, `seeker.register.${key}`);

/** "다음" → the next wizard screen is loaded (full page load) and hydrated. */
async function next(page: Page, expected: RegExp) {
  await page.getByTestId("wizard-next").click();
  await expect(page).toHaveURL(expected, { timeout: 15_000 });
  await waitForHydration(page, "wizard-next");
}

/** A separate browser context (own cookies: staff, employer and seeker sessions never mix). */
async function contextFor(browser: Browser, page: Page, baseURL: string) {
  return browser.newContext({
    baseURL,
    extraHTTPHeaders: { "x-forwarded-for": uniqueIp() },
    viewport: page.viewportSize() ?? undefined,
  });
}

/** Steps 1 ~ 7 of the wizard for a quick-registered F-4 seeker (JOB_MATCH). */
async function completeProfile(page: Page) {
  await page.getByTestId("complete-profile").click();
  await expect(page).toHaveURL(/\/ko\/seeker\/register$/);
  await waitForHydration(page, "wizard-next");
  await expect(page.getByTestId("wizard-screen")).toHaveAttribute("data-step", "1");

  const s1 = page.getByTestId("wizard-step-1");
  await s1
    .getByLabel(new RegExp(t("step1.legalName.label").replace(/[()]/g, ".")))
    .fill("NGUYEN VAN INTEGRATION");
  await s1.locator('select[name="nationality"]').selectOption("VN");
  await s1.locator('select[name="sido"]').selectOption({ index: 1 });
  await next(page, /step=2$/);

  const s2 = page.getByTestId("wizard-step-2");
  await expect(s2.getByTestId("visa-select")).toHaveValue("F-4");
  const exp = monthFromNow(24);
  await s2.locator('select[name="stayExpiry-year"]').selectOption(exp.year);
  await s2.locator('select[name="stayExpiry-month"]').selectOption(exp.month);
  await chip(page, t("step2.hasArc.label"), t("common.yes")).click();
  await s2.getByRole("checkbox").check();
  await next(page, /step=3&sub=a$/);

  await chip(
    page,
    t("step3.educationLevel.label"),
    t("step3.educationLevel.option.BACHELOR"),
  ).click();
  await next(page, /step=3&sub=b$/);
  await chip(page, t("step3.topikLevel.label"), t("step3.topikLevel.option.3")).click();
  await chip(page, t("step3.kiipStage.label"), t("step3.kiipStage.option.1")).click();
  await chip(page, t("step3.koreanSpeaking.label"), t("step3.koreanSpeaking.option.3")).click();
  await next(page, /step=4$/);

  await page.getByTestId("add-experience").click();
  const row = page.getByTestId("experience-row");
  await row.locator("select").nth(0).selectOption("VN");
  await row.locator("select").nth(1).selectOption({ index: 1 });
  await row.locator("select").nth(2).selectOption("WELDING");
  await row.locator('input[name="experiences.0.months"]').fill("24");
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
  await next(page, /sub=b$/);
  await chip(page, t("step5.needDormitory.label"), t("common.yes")).click();
  await chip(page, t("step5.shiftOk.label"), t("step5.shiftOk.option.YES")).click();
  await next(page, /step=6$/);
  await next(page, /step=7$/);

  // the quick signup already gave PRIVACY_REQUIRED / BLIND_PROFILE / NOTICE: they stay ticked
  for (const type of ["PRIVACY_REQUIRED", "BLIND_PROFILE", "NOTICE"]) {
    await page.getByTestId(`consent-${type}`).getByRole("checkbox").check();
  }
  await page.getByTestId("wizard-next").click();
  await expect(page).toHaveURL(/\/ko\/seeker\/register\/complete$/, { timeout: 15_000 });
}

test("R-217 / WO15-11: 간편 등록 → 프로필 완성 → 관리자 A 승격(2FA) → 기업 후보 노출 → 면접 요청 → 추천 원장", async ({
  page,
  browser,
}) => {
  test.setTimeout(240_000);
  const phone = uniquePhone();

  // 1. 간편 등록 (R-105): account, grade B, JOB_MATCH
  await quickRegisterUi(page, { locale: L, phone, visaCode: "F-4" });
  const quick = await seekerProfileByPhone(phone);
  expect(quick).toMatchObject({ isQuickSignup: true, grade: "B", completedStep: 0 });
  const seekerId = quick?.id as string;
  const publicId = toBlindPublicId(quick?.publicId as string);

  // 2. 프로필 완성 (R-106): the wizard continues the same account to Step 7
  await completeProfile(page);
  expect(await seekerProfileByPhone(phone)).toMatchObject({
    completedStep: 7,
    grade: "B",
    track: "JOB_MATCH",
    jobSearchStatus: "IMMEDIATE",
  });
  // grade B is not shown to companies yet (BR-06)
  expect(await isEligibleCandidate(seekerId)).toBe(false);

  // 3. 관리자 A 승격 (R-118 2FA, R-120): password → TOTP setup → 확인 항목 → B→A
  const staffContext = await contextFor(browser, page, DEFAULT_URL);
  const staff = await staffContext.newPage();
  const staffId = await signInNewStaff(staff, "ADMIN");
  await staff.goto(`/admin/seekers/${seekerId}`);
  await waitForHydration(staff, "flags-form");
  await staff.getByTestId("flag-consulted").check();
  await staff.getByTestId("flag-verifiedVisa").check();
  await staff.getByTestId("flags-save").click();
  await expect.poll(async () => (await auditFor(seekerId, "SEEKER_REVIEW_UPDATE")).length).toBe(1);
  await staff.reload();
  await waitForHydration(staff, "grade-form");
  await staff.getByTestId("promote-A").click();
  await expect(staff.getByTestId("seeker-grade")).toHaveText("A등급");
  await expect
    .poll(async () => (await auditFor(seekerId, "SEEKER_GRADE_CHANGE")).map((r) => r.actorId))
    .toEqual([staffId]);
  expect(await isEligibleCandidate(seekerId)).toBe(true);

  // 4. 기업 후보 노출 (R-205, flag-on server): verified + contracted company sees the blind card
  const tag = await tagForCandidateList(seekerId);
  const { email, companyId } = await createCandidateEmployer({ verified: true, contracted: true });
  const employerContext = await contextFor(browser, page, candidatesURL());
  const employer = await employerContext.newPage();
  await loginEmployer(employer, email, `/employer/candidates?convertible=${tag}`);
  const cards = employer.getByTestId("candidate-card");
  await expect(cards).toHaveCount(1);
  const card = employer.locator(`[data-public-id="${publicId}"]`);
  await expect(card).toBeVisible();
  await expect(card.getByTestId("grade-badge")).toHaveAttribute("data-grade", "A");
  // blind (BR-02): neither the name typed in the wizard nor the phone number is on the screen
  const main = await employer.locator("main").innerText();
  expect(main).not.toContain("NGUYEN VAN INTEGRATION");
  expect(main).not.toContain(phone.slice(-8));

  // 5. 면접 요청 (R-207): goes to VISA n JOB as an InterestRequest, never to the seeker
  await waitForHydration(employer, "interview-form");
  await card.getByRole("button", { name: msg(L, "employer.candidates.interview.cta") }).click();
  await expect(card.getByTestId("interview-requested")).toContainText(
    msg(L, "employer.candidates.interview.done"),
  );
  const requests = await interviewRequestsOf(companyId);
  expect(requests).toEqual([{ id: requests[0]?.id, seekerId, status: "RECEIVED" }]);
  const interestId = requests[0].id;

  // 6. 관리자 추천 (R-209): the 면접 요청 is on /admin/matching (newest first) → 추천 실행
  await staff.goto("/admin/matching");
  const interest = staff.locator(`[data-interest-id="${interestId}"]`);
  await expect(interest).toBeVisible();
  await waitForHydration(staff, "recommend-open");
  await interest.getByTestId("recommend-open").click();
  await staff.getByTestId("recommend-confirm").click();
  // the answered 면접 요청 leaves the waiting list (the page is revalidated)
  await expect(interest).toHaveCount(0);

  // 7. Recommendation 원장 행 (R-217, BR-09/BR-10): one row, this seeker → this company, by this staff
  await expect.poll(async () => (await ledgerRowsOf(seekerId)).length).toBe(1);
  const ledger = await ledgerRowsOf(seekerId);
  expect(ledger).toEqual([{ id: ledger[0]?.id, companyId, postingId: null, staffId }]);
  expect(await auditActionsOf(ledger[0].id)).toEqual(["RECOMMENDATION_CREATE"]);
  expect((await interviewRequestsOf(companyId))[0].status).toBe("RECOMMENDED");

  await employerContext.close();
  await staffContext.close();
});
