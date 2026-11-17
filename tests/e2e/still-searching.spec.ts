import { expect, test } from "@playwright/test";

import { createStatusCheckSeeker, seekerStatus } from "./support/p2dDb";
import { isolate, waitForHydration } from "./support/seekerFlow";
import { p2dShot } from "./support/shots";

// R-213 "아직 구직 중이세요?" one-click answer: opening the link changes nothing, one button confirms,
// the link works once; a forged link is refused. No sign-in, nothing personal on the page.
test.beforeEach(async ({ page }) => isolate(page));

async function noHorizontalScroll(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
}

test("R-213: still-searching link → one button → confirmed, then 'already answered'", async ({
  page,
}, info) => {
  const { seekerId, token } = await createStatusCheckSeeker();
  const before = await seekerStatus(seekerId);

  const res = await page.goto(`/ko/seeker/still-searching/${token}`);
  expect(res?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(page.getByTestId("still-searching")).toHaveAttribute("data-state", "ASK");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("아직 일자리를 찾고 계신가요?");
  // opening the page changed nothing
  expect((await seekerStatus(seekerId)).statusCheckSentAt).toEqual(before.statusCheckSentAt);
  await noHorizontalScroll(page);
  await waitForHydration(page, "still-searching-form");
  const button = page.getByTestId("still-searching-yes");
  const box = await button.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  await p2dShot(page, info, "still_searching_ask");

  await button.click();
  await expect(page.getByTestId("still-searching-result")).toHaveAttribute("data-kind", "done");
  await p2dShot(page, info, "still_searching_done");
  const after = await seekerStatus(seekerId);
  expect(after.statusCheckSentAt).toBeNull();
  expect(after.lastActiveConfirmedAt.getTime()).toBeGreaterThan(
    before.lastActiveConfirmedAt.getTime(),
  );

  // the same link again: already answered, no button
  await page.reload();
  await expect(page.getByTestId("still-searching")).toHaveAttribute("data-state", "ANSWERED");
  await expect(page.getByTestId("still-searching-yes")).toHaveCount(0);
});

test("R-213: a forged or broken link is refused in every locale (no error page)", async ({
  page,
}, info) => {
  const { token } = await createStatusCheckSeeker();
  const [body] = token.split(".");
  for (const locale of ["ko", "en", "vi", "ru", "zh", "uz"]) {
    await page.goto(`/${locale}/seeker/still-searching/${body}.${"A".repeat(43)}`);
    await expect(page.getByTestId("still-searching")).toHaveAttribute("data-state", "INVALID");
    await expect(page.getByText("Application error")).toHaveCount(0);
  }
  await noHorizontalScroll(page);
  await p2dShot(page, info, "still_searching_invalid");
  // an expired check (sent 15 days ago)
  const old = await createStatusCheckSeeker(new Date(Date.now() - 15 * 86_400_000));
  await page.goto(`/ko/seeker/still-searching/${old.token}`);
  await expect(page.getByTestId("still-searching")).toHaveAttribute("data-state", "EXPIRED");
  await expect(page.getByTestId("still-searching-result")).toContainText("상담 신청");
});
