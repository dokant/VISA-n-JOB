import { expect, test } from "@playwright/test";

import { uniquePhone } from "./support/authDb";
import { msg } from "./support/messages";
import { isolate, quickRegisterUi } from "./support/seekerFlow";

// R-112 완료 화면: 등급 B + 승급 안내, 추천 코드 + 메신저별 공유, 트랙별 다음 행동 버튼.
test.use({ baseURL: `http://localhost:${process.env.E2E_PORT ?? 3100}` });
test.beforeEach(async ({ page }) => isolate(page));

test("R-112: grade B, upgrade guide, referral code + share buttons, JOB_MATCH next actions", async ({
  page,
}) => {
  await quickRegisterUi(page, { locale: "ko", phone: uniquePhone(), visaCode: "F-4" });
  const done = page.getByTestId("register-complete");
  await expect(done.getByTestId("grade-badge")).toHaveText(
    msg("ko", "seeker.grade.label").replace("{grade}", "B"),
  );
  await expect(done.getByTestId("grade-upgrade")).toHaveText(msg("ko", "seeker.complete.upgrade"));
  await expect(done.getByTestId("referral-code")).toHaveText(/^[A-Z0-9]{8}$/);
  for (const id of ["share-copy", "share-whatsapp", "share-telegram", "share-viber"]) {
    await expect(done.getByTestId(id)).toBeVisible();
  }
  await expect(done.getByTestId("share-whatsapp")).toHaveAttribute("href", /^https:\/\/wa\.me\//);
  await expect(done.getByTestId("share-telegram")).toHaveAttribute(
    "href",
    /^https:\/\/t\.me\/share/,
  );
  await expect(done.getByTestId("share-viber")).toHaveAttribute("href", /^viber:\/\/forward/);
  await expect(done.getByTestId("track-guide")).toHaveText(
    msg("ko", "seeker.next.guide.JOB_MATCH"),
  );
  await expect(done.getByTestId("action-recommended")).toBeVisible();
  await expect(done.getByTestId("action-stay")).toBeVisible();
  await expect(done.getByTestId("no-seeker-fee")).toBeVisible();
  // quick signup: invitation to complete the profile
  await expect(done.getByTestId("complete-profile")).toHaveAttribute("href", "/ko/seeker/register");
  // 375px: no horizontal scroll (N-04, S-07)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});

test("R-112: E-9 (FUTURE_POOL) gets consult + E-7-4 calculator instead of job recommendations", async ({
  page,
}) => {
  await quickRegisterUi(page, {
    locale: "en",
    phone: uniquePhone(),
    visaCode: "E-9",
    blind: false,
  });
  const done = page.getByTestId("register-complete");
  await expect(done.getByTestId("track-guide")).toHaveText(
    msg("en", "seeker.next.guide.FUTURE_POOL"),
  );
  await expect(done.getByTestId("action-consult")).toBeVisible();
  await expect(done.getByTestId("action-score")).toHaveAttribute("href", "/en/score/e74");
  await expect(done.getByTestId("action-recommended")).toHaveCount(0);
});
