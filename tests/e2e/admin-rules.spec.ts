import { expect, test } from "@playwright/test";

import { signInNewStaff } from "./support/adminDb";
import { createE2eVisa, ruleAudit, ruleRow, scoreTableRow } from "./support/p2dDb";
import { isolate, waitForHydration } from "./support/seekerFlow";
import { p2dShot } from "./support/shots";

// R-215 규칙 DB·점수표: STAFF_VISA creates a draft, publishes it through the confirmation dialog
// (reviewedBy / reviewedAt + RULE_PUBLISH), makes a new version and retires; STAFF_PLACEMENT is
// refused. The test visa is an inactive code and the test table is not named E-7-4, so nothing here
// changes a public screen of the development site (the public effect is covered by the unit tests).
test.use({ baseURL: `http://localhost:${process.env.E2E_PORT ?? 3100}` });
test.beforeEach(async ({ page }) => isolate(page));

test("R-215: rule draft → 게시 (dialog, reviewer recorded) → 새 버전 → 게시 retires v1 → 폐기", async ({
  page,
}, info) => {
  const visa = await createE2eVisa();
  const staffId = await signInNewStaff(page, "STAFF_VISA");

  await page.goto("/admin/rules");
  await expect(page.getByTestId("admin-rules")).toBeVisible();
  await waitForHydration(page, "visa-rule-form");
  await p2dShot(page, info, "admin_rules");
  await page.getByLabel("비자", { exact: true }).selectOption(visa);
  await page.getByLabel("판정").selectOption("GREEN");
  await page.getByLabel("조건 (JSON, 행정사 입력)").fill("{not json");
  await page.getByTestId("visa-rule-save").click();
  // a refused save keeps the typed values
  await expect(page.getByTestId("action-error")).toHaveAttribute("data-code", "INVALID_JSON");
  await expect(page.getByLabel("비자", { exact: true })).toHaveValue(visa);
  await page.getByLabel("조건 (JSON, 행정사 입력)").fill('{ "all": [] }');
  await page.getByTestId("visa-rule-save").click();
  await expect(page).toHaveURL(/\/admin\/rules\/c[0-9a-z]+$/);
  const v1 = page.url().split("/").pop() as string;
  await expect(page.getByTestId("admin-rule")).toHaveAttribute("data-status", "DRAFT");

  // 게시 asks first; closing changes nothing
  await waitForHydration(page, "rule-publish");
  await page.getByTestId("rule-publish").click();
  const dialog = page.getByTestId("rule-publish-dialog");
  await expect(dialog).toContainText("이전 게시 버전은 폐기");
  await p2dShot(page, info, "admin_rule_publish_dialog");
  await dialog.getByRole("button", { name: "취소" }).click();
  await expect(dialog).toHaveCount(0);
  expect((await ruleRow(v1)).status).toBe("DRAFT");

  await page.getByTestId("rule-publish").click();
  await page.getByTestId("rule-publish-confirm").click();
  await expect(page.getByTestId("admin-rule")).toHaveAttribute("data-status", "PUBLISHED");
  const published = await ruleRow(v1);
  expect(published.reviewedBy).toBe(staffId);
  expect(published.reviewedAt).not.toBeNull();
  expect((await ruleAudit(v1)).map((a) => [a.actorId, a.meta])).toEqual([
    [staffId, { change: "PUBLISH", version: 1, retiredIds: [] }],
  ]);
  await p2dShot(page, info, "admin_rule_published");

  // 새 버전 → draft v2 → 게시 → v1 RETIRED
  await waitForHydration(page, "rule-new-version");
  await page.getByTestId("rule-new-version").click();
  await expect(page).not.toHaveURL(new RegExp(`/admin/rules/${v1}$`));
  await expect(page.getByTestId("admin-rule")).toHaveAttribute("data-status", "DRAFT");
  const v2 = page.url().split("/").pop() as string;
  await waitForHydration(page, "rule-publish");
  await page.getByTestId("rule-publish").click();
  await page.getByTestId("rule-publish-confirm").click();
  await expect(page.getByTestId("admin-rule")).toHaveAttribute("data-status", "PUBLISHED");
  expect((await ruleRow(v1)).status).toBe("RETIRED");
  expect((await ruleAudit(v2)).at(-1)?.meta).toEqual({
    change: "PUBLISH",
    version: 2,
    retiredIds: [v1],
  });

  // 폐기 (destructive dialog)
  await waitForHydration(page, "rule-retire");
  await page.getByTestId("rule-retire").click();
  await page.getByTestId("rule-retire-confirm").click();
  await expect(page.getByTestId("admin-rule")).toHaveAttribute("data-status", "RETIRED");
  expect((await ruleAudit(v2)).at(-1)?.meta).toEqual({ change: "RETIRE", version: 2 });
});

test("R-215: score table draft → 게시 records the reviewer; STAFF_PLACEMENT is refused", async ({
  page,
  browser,
}, info) => {
  const staffId = await signInNewStaff(page, "STAFF_VISA");
  await page.goto("/admin/score-tables");
  await expect(page.getByTestId("admin-score-tables")).toBeVisible();
  await waitForHydration(page, "score-table-form");
  await p2dShot(page, info, "admin_score_tables");
  const name = `E2E-${Date.now().toString(36)}`.slice(0, 20);
  await page.getByLabel("점수표 이름").fill(name);
  await page.getByLabel("항목·구간·배점 (JSON, 행정사 입력)").fill(
    JSON.stringify({
      items: [{ key: "e2e", label: "E2E 항목", bands: [{ key: "b0", label: "E2E", points: 0 }] }],
    }),
  );
  await page.getByTestId("score-table-save").click();
  await expect(page).toHaveURL(/\/admin\/score-tables\/c[0-9a-z]+$/);
  const id = page.url().split("/").pop() as string;
  await waitForHydration(page, "table-publish");
  await page.getByTestId("table-publish").click();
  await page.getByTestId("table-publish-confirm").click();
  await expect(page.getByTestId("admin-score-table")).toHaveAttribute("data-status", "PUBLISHED");
  expect((await scoreTableRow(id)).reviewedBy).toBe(staffId);
  await p2dShot(page, info, "admin_score_table_published");

  // STAFF_PLACEMENT: both screens refused
  const ctx = await browser.newContext({
    baseURL: `http://localhost:${process.env.E2E_PORT ?? 3100}`,
  });
  const other = await ctx.newPage();
  await isolate(other);
  await signInNewStaff(other, "STAFF_PLACEMENT");
  for (const path of ["/admin/rules", `/admin/score-tables/${id}`]) {
    await other.goto(path);
    await expect(other.getByTestId("admin-forbidden")).toBeVisible();
  }
  await ctx.close();
});
