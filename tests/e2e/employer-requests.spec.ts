import { expect, test } from "@playwright/test";

import { uniquePhone, uniqueIp } from "./support/authDb";
import { loginEmployer } from "./support/candidatesDb";
import {
  createMatchEmployer,
  createMatchSeeker,
  createRecommendedInterview,
  interviewConsents,
  uniqueName,
  uniqueTag,
} from "./support/matchingDb";
import { msg } from "./support/messages";
import { isolate, loginUi, waitForHydration } from "./support/seekerFlow";
import { p2cShot } from "./support/shots";

// P2c: R-212 /employer/requests, R-211 (v1.1, PC-1) 면접 건별 동의 — the company sees the real name
// only for a consented, confirmed interview of its own, never contacts; revocation hides it at once.
test.use({ baseURL: `http://localhost:${process.env.E2E_PORT ?? 3100}` });
test.beforeEach(async ({ page }) => isolate(page));

test("R-212: /employer/requests needs an employer session", async ({ page }) => {
  await page.goto("/ko/employer/requests");
  await expect(page).toHaveURL(/\/ko\/employer\/login\?next=/);
});

test("R-211 / R-212: name hidden before consent, shown after the seeker agrees on /seeker/me, hidden again after revocation", async ({
  page,
  browser,
}, info) => {
  const visa = uniqueTag();
  const name = uniqueName();
  const phone = uniquePhone();
  const employer = await createMatchEmployer(visa);
  const seeker = await createMatchSeeker(phone, visa, name);
  const { interviewId } = await createRecommendedInterview({
    seekerId: seeker.id,
    companyId: employer.companyId,
    postingId: employer.postingId,
    status: "CONFIRMED",
  });

  // ── employer: before consent ──
  await loginEmployer(page, employer.email, "/employer/requests");
  const card = page.locator(
    `[data-testid="requests-interview"][data-interview-id="${interviewId}"]`,
  );
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute("data-name-state", "PENDING");
  await expect(page.getByTestId("requests-disclosed-name")).toHaveCount(0);
  expect(await page.content()).not.toContain(name);
  const apiBefore = await page.request.get("/api/employer/requests");
  expect(apiBefore.status()).toBe(200);
  const apiBeforeText = await apiBefore.text();
  expect(apiBeforeText).not.toContain(name);
  expect(apiBeforeText).not.toContain("p2c.hidden@example.test");
  await expect(
    page.getByText(msg("ko", "employer.requests.interviews.nameState.PENDING")),
  ).toBeVisible();
  await p2cShot(page, info, "employer_requests_before");

  // ── seeker: agree on /seeker/me (own browser context) ──
  const seekerContext = await browser.newContext({
    baseURL: `http://localhost:${process.env.E2E_PORT ?? 3100}`,
    viewport: page.viewportSize() ?? undefined,
    extraHTTPHeaders: { "x-forwarded-for": uniqueIp() },
  });
  const seekerPage = await seekerContext.newPage();
  await loginUi(seekerPage, "ko", phone);
  const item = seekerPage.locator(
    `[data-testid="interview-consent-item"][data-interview-id="${interviewId}"]`,
  );
  await expect(item).toHaveAttribute("data-state", "PENDING");
  await expect(seekerPage.getByTestId("interview-consent-card")).toContainText(
    msg("ko", "seeker.me.interviewConsent.title"),
  );
  // BR-03: the seeker side shows no company name and no place
  await expect(seekerPage.getByTestId("interview-consent-card")).not.toContainText("회의실");
  await expect(seekerPage.getByTestId("interview-consent-card")).not.toContainText("이투이");
  await p2cShot(seekerPage, info, "seeker_consent");
  await waitForHydration(seekerPage, "interview-consents");
  await item.getByTestId("interview-consent-agree").click();
  await expect(item).toHaveAttribute("data-state", "AGREED");
  expect((await interviewConsents(interviewId)).filter((c) => c.revokedAt === null)).toHaveLength(
    1,
  );

  // ── employer: after consent, the name inside this interview only ──
  await page.reload();
  await expect(card).toHaveAttribute("data-name-state", "GIVEN");
  await expect(card.getByTestId("requests-disclosed-name")).toHaveText(name);
  const apiAfter = await (await page.request.get("/api/employer/requests")).text();
  expect(apiAfter).toContain(name);
  expect(apiAfter).not.toMatch(/p2c\.hidden@example\.test|\+8210/);
  await p2cShot(page, info, "employer_requests_after");

  // ── seeker revokes → the name disappears at once ──
  await item.getByTestId("interview-consent-revoke").click();
  await seekerPage.getByTestId("interview-consent-revoke-confirm").click();
  await expect(item).toHaveAttribute("data-state", "PENDING");
  await page.reload();
  await expect(card).toHaveAttribute("data-name-state", "PENDING");
  expect(await page.content()).not.toContain(name);
  expect(await (await page.request.get("/api/employer/requests")).text()).not.toContain(name);
  await seekerContext.close();
});

test("R-211: another company never sees the name, even after consent", async ({ page }) => {
  const visa = uniqueTag();
  const name = uniqueName();
  const phone = uniquePhone();
  const employer = await createMatchEmployer(visa);
  const other = await createMatchEmployer(visa);
  const seeker = await createMatchSeeker(phone, visa, name);
  const { interviewId } = await createRecommendedInterview({
    seekerId: seeker.id,
    companyId: employer.companyId,
    postingId: employer.postingId,
    status: "CONFIRMED",
  });
  await createRecommendedInterview({
    seekerId: seeker.id,
    companyId: other.companyId,
    postingId: other.postingId,
    status: "CONFIRMED",
  });
  await loginUi(page, "ko", phone);
  await waitForHydration(page, "interview-consents");
  await page
    .locator(`[data-testid="interview-consent-item"][data-interview-id="${interviewId}"]`)
    .getByTestId("interview-consent-agree")
    .click();
  await expect(
    page.locator(`[data-testid="interview-consent-item"][data-interview-id="${interviewId}"]`),
  ).toHaveAttribute("data-state", "AGREED");

  await page.context().clearCookies();
  await loginEmployer(page, other.email, "/employer/requests");
  await expect(page.getByTestId("requests-interview")).toHaveCount(1);
  expect(await page.content()).not.toContain(name);
  expect(await (await page.request.get("/api/employer/requests")).text()).not.toContain(name);
});
