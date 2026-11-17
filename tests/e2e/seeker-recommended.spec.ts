import { expect, test } from "@playwright/test";

import { uniquePhone } from "./support/authDb";
import { jobsURL } from "./support/jobsDb";
import {
  createMatchEmployer,
  createMatchSeeker,
  createRecommendedInterview,
  uniqueName,
  uniqueTag,
} from "./support/matchingDb";
import { msg } from "./support/messages";
import { isolate, loginUi } from "./support/seekerFlow";
import { p2cShot } from "./support/shots";

// P2c: R-212 /seeker/me/recommended (PC-13: 비자·지역·업종 일치 공개 공고 + 본인 추천 건).
// FEATURE_PUBLIC_JOBS off → the postings part is ComingSoon (SC-07), the own records still show.
test.beforeEach(async ({ page }) => isolate(page));

test.describe("flag off (default server)", () => {
  test.use({ baseURL: `http://localhost:${process.env.E2E_PORT ?? 3100}` });

  test("R-212: postings part is ComingSoon; own recommendation and interview are listed without company data", async ({
    page,
  }) => {
    const visa = uniqueTag();
    const phone = uniquePhone();
    const employer = await createMatchEmployer(visa);
    const seeker = await createMatchSeeker(phone, visa, uniqueName());
    await createRecommendedInterview({
      seekerId: seeker.id,
      companyId: employer.companyId,
      postingId: employer.postingId,
      status: "SCHEDULED",
    });
    await loginUi(page, "ko", phone);
    await page.getByTestId("link-recommended").click();
    await expect(page).toHaveURL(/\/ko\/seeker\/me\/recommended$/);
    await expect(page.getByTestId("coming-soon")).toBeVisible();
    await expect(page.getByTestId("posting-card")).toHaveCount(0);
    const mine = page.getByTestId("recommended-mine-item");
    await expect(mine).toHaveCount(1);
    await expect(mine).toContainText(msg("ko", "seeker.recommended.interviewStatus.SCHEDULED"));
    // BR-03: no company name, place or link to a non-public posting
    await expect(page.locator("main")).not.toContainText("이투이");
    await expect(page.locator("main")).not.toContainText("회의실");
    await expect(mine.getByRole("link")).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("R-212: anonymous visitors go to the seeker login", async ({ page }) => {
    await page.goto("/en/seeker/me/recommended");
    await expect(page).toHaveURL(/\/en\/seeker\/login\?next=/);
  });
});

test.describe("flag on (FEATURE_PUBLIC_JOBS server)", () => {
  test.use({ baseURL: jobsURL() });

  test("R-212 / PC-13: matching public posting + own recommendation with a posting link", async ({
    page,
  }, info) => {
    const visa = uniqueTag();
    const phone = uniquePhone();
    const employer = await createMatchEmployer(visa);
    const nonMatching = await createMatchEmployer(`${visa}-X`);
    const seeker = await createMatchSeeker(phone, visa, uniqueName());
    await createRecommendedInterview({
      seekerId: seeker.id,
      companyId: employer.companyId,
      postingId: employer.postingId,
      status: "CONFIRMED",
    });
    await loginUi(page, "ko", phone);
    await page.goto("/ko/seeker/me/recommended");
    const cards = page.getByTestId("recommended-postings").getByTestId("posting-card");
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toHaveAttribute("data-posting-id", employer.postingId);
    await expect(page.locator(`[data-posting-id="${nonMatching.postingId}"]`)).toHaveCount(0);
    const mine = page.getByTestId("recommended-mine-item");
    await expect(mine).toHaveCount(1);
    await expect(mine).toContainText(msg("ko", "seeker.recommended.interviewStatus.CONFIRMED"));
    await expect(
      mine.getByRole("link", { name: msg("ko", "seeker.recommended.viewPosting") }),
    ).toHaveAttribute("href", `/ko/jobs/${employer.postingId}`);
    await expect(page.locator("main")).not.toContainText("이투이");
    // 375px: no horizontal scroll (N-04)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await p2cShot(page, info, "seeker_recommended");
  });
});
