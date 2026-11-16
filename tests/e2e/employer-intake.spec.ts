import { type Page, expect, test } from "@playwright/test";

import { msg } from "./support/messages";
import {
  EMPLOYER_PASSWORD,
  createEmployerAccount,
  leadsOfCompany,
  reviewTasksOfCompany,
} from "./support/employerDb";
import { isolate } from "./support/seekerFlow";

// P1d: R-124 무료 채용 진단, R-125 구인 의뢰서. Origin "localhost": see auth.spec.ts (session cookie).
test.use({ baseURL: `http://localhost:${process.env.E2E_PORT ?? 3100}` });
test.beforeEach(async ({ page }) => isolate(page));

async function noHorizontalScroll(page: Page) {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll).toBeLessThanOrEqual(client);
}

async function fillDiagnosis(page: Page) {
  const form = page.getByTestId("diagnosis-form");
  await form.locator('select[name="industryCode"]').selectOption({ index: 3 });
  await form.locator('select[name="sido"]').selectOption({ index: 1 });
  await form.locator('select[name="sigungu"]').selectOption({ index: 1 });
  await form.locator('input[name="regularEmployees"]').fill("30");
  await form.locator('input[name="insuredDomestic"]').fill("25");
  await page.getByTestId("diagnosis-add-visa").click();
  await form.locator('select[name="foreignWorkers.0.visaCode"]').selectOption({ index: 1 });
  await form.locator('input[name="foreignWorkers.0.count"]').fill("2");
}

test.describe("R-124 /employer/diagnosis", () => {
  test("R-124 WO15-09: no PUBLISHED rule → 확인 필요 card with the reference disclaimer", async ({
    page,
  }) => {
    await page.goto("/ko/employer/diagnosis");
    await expect(page.locator("h1")).toHaveText(msg("ko", "employer.diagnosis.title"));
    await expect(page.getByTestId("notice-box")).toHaveText(msg("ko", "employer.diagnosis.notice"));

    // required fields are checked in the page language
    await page.getByRole("button", { name: msg("ko", "employer.diagnosis.submit") }).click();
    await expect(page.getByText(msg("ko", "errors.field.required")).first()).toBeVisible();

    await fillDiagnosis(page);
    await page.getByRole("button", { name: msg("ko", "employer.diagnosis.submit") }).click();
    const result = page.getByTestId("diagnosis-result");
    await expect(result.getByRole("heading", { level: 2 })).toHaveText(
      msg("ko", "employer.diagnosis.result.title"),
    );
    const cards = result.getByTestId("outcome-card");
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toHaveAttribute("data-outcome", "YELLOW");
    await expect(cards.first()).toContainText(msg("ko", "visa.outcome.YELLOW"));
    await expect(cards.first()).toContainText(msg("ko", "visa.result.needsReview"));
    await expect(cards.first().getByTestId("reference-disclaimer")).toHaveText(
      msg("ko", "common.disclaimer.reference"),
    );
    await expect(page.getByTestId("diagnosis-needs-review")).toBeVisible();
    await expect(
      result.getByRole("link", { name: msg("ko", "employer.diagnosis.result.request") }),
    ).toHaveAttribute("href", /\/ko\/employer\/request$/);
    await noHorizontalScroll(page);
  });

  test("renders in every locale without the forbidden apply wording", async ({ page }) => {
    for (const locale of ["en", "vi", "ru", "zh", "uz"]) {
      await page.goto(`/${locale}/employer/diagnosis`);
      await expect(page.locator("h1")).toHaveText(msg(locale, "employer.diagnosis.title"));
      await expect(
        page.getByRole("button", { name: msg(locale, "employer.diagnosis.submit") }),
      ).toBeVisible();
      // SC-06: no "지원하기" / "Apply" anywhere on the screen
      expect(await page.locator("body").innerText()).not.toMatch(/지원하기|Apply/);
    }
  });
});

test.describe("R-125 /employer/request", () => {
  test("needs an employer sign-in (redirect to the login with next)", async ({ page }) => {
    await page.goto("/ko/employer/request");
    await expect(page).toHaveURL(/\/ko\/employer\/login\?next=(%2F|\/)employer(%2F|\/)request$/);
  });

  test("R-125: contact in free text is refused with the reason; a fixed request becomes a B lead", async ({
    page,
  }) => {
    const { email, companyId } = await createEmployerAccount();
    await page.goto("/ko/employer/login?next=/employer/request");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(EMPLOYER_PASSWORD);
    await page.getByRole("button", { name: msg("ko", "employer.login.submit") }).click();
    await expect(page).toHaveURL(/\/ko\/employer\/request$/);
    await expect(page.getByTestId("job-request-list")).toContainText(
      msg("ko", "employer.request.list.empty"),
    );

    const form = page.getByTestId("job-request-form");
    const next = () =>
      page.getByRole("button", { name: msg("ko", "employer.request.next") }).click();
    // step 1: company (name prefilled from the company)
    await expect(form.locator('input[name="companyName"]')).toHaveValue("이투이 구인 제조");
    await form.locator('select[name="sigungu"]').selectOption({ index: 1 });
    await form.locator('input[name="employeeCount"]').fill("40");
    await form.locator('input[name="contactName"]').fill("이담당");
    await form.locator('input[name="contactPhone"]').fill("010-2468-1357");
    await next();
    // step 2: job
    await expect(form).toHaveAttribute("data-step", "job");
    await form.locator('input[name="role"]').fill("포장");
    await form.locator('input[name="payMin"]').fill("2600000");
    await form.locator('input[name="workHours"]').fill("09:00~18:00, 주 5일");
    await page
      .getByTestId("job-request-overtime")
      .getByText(msg("ko", "employer.request.overtime.option.NONE"))
      .click();
    await form.locator('input[name="headcount"]').fill("2");
    await page
      .getByTestId("job-request-startTiming")
      .getByText(msg("ko", "employer.request.startTiming.option.IMMEDIATE"))
      .click();
    await next();
    // step 3: living + a contact in free text
    await expect(form).toHaveAttribute("data-step", "living");
    await page
      .getByTestId("job-request-dormitory")
      .getByText(msg("ko", "employer.request.dormitory.option.PROVIDED"))
      .click();
    await page
      .getByTestId("job-request-meals")
      .getByText(msg("ko", "employer.request.meals.option.PROVIDED"), { exact: true })
      .click();
    const detail = form.locator('textarea[name="detail"]');
    await detail.fill("궁금하면 카톡 아이디 hongjob 으로 연락 주세요");
    await page.getByRole("button", { name: msg("ko", "employer.request.submit") }).click();
    await expect(page.getByText(msg("ko", "errors.field.contactInfo"))).toBeVisible();
    await expect(detail).toHaveAttribute("aria-invalid", "true");
    expect(await leadsOfCompany(companyId)).toEqual([]);

    await detail.fill("기숙사 2인 1실, 통근 버스 있음");
    await page.getByRole("button", { name: msg("ko", "employer.request.submit") }).click();
    await expect(page.getByTestId("job-request-done")).toContainText(
      msg("ko", "employer.request.done.title"),
    );
    await expect(page.getByTestId("job-request-status").first()).toHaveText(
      msg("ko", "employer.request.list.status.reviewing"),
    );
    const leads = await leadsOfCompany(companyId);
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({ grade: "B", source: "REQUEST", title: "포장" });
    expect(await reviewTasksOfCompany(companyId)).toEqual([
      { status: "OPEN", assigneeRole: "STAFF_PLACEMENT" },
    ]);
    await noHorizontalScroll(page);
  });
});
