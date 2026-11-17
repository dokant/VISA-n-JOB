import { type Route, expect, test } from "@playwright/test";

import { INTRO_CONFIRM_MAX_BYTES, SERVER_ACTION_BODY_LIMIT } from "@/config/limits";

import { signInNewStaff } from "./support/adminDb";
import { uniquePhone } from "./support/authDb";
import {
  createEmployerInterest,
  createMatchEmployer,
  createMatchSeeker,
  interviewsOf,
  recommendationsOf,
  uniqueName,
  uniqueTag,
  visaCasesOf,
} from "./support/matchingDb";
import { isolate, waitForHydration } from "./support/seekerFlow";
import { p2cShot } from "./support/shots";

// P2c admin: R-209 매칭·추천 원장·면접 일정, R-210 소개 확인서 (private storage, 5-minute signed link),
// R-216 체류 사건 (STAFF_PLACEMENT refused).
test.use({ baseURL: `http://localhost:${process.env.E2E_PORT ?? 3100}` });
test.beforeEach(async ({ page }) => isolate(page));

const PDF = Buffer.from("%PDF-1.4\n% e2e intro confirmation\n");

test("R-209 / R-210: posting → eligible seeker → 추천 실행 → 면접 일정 → 확정 → 소개 확인서 upload and signed download", async ({
  page,
}, info) => {
  const visa = uniqueTag();
  const employer = await createMatchEmployer(visa);
  const seeker = await createMatchSeeker(uniquePhone(), visa, uniqueName());
  const staffId = await signInNewStaff(page, "STAFF_PLACEMENT");

  // P2c QA O-4: a new 면접 요청 is on page 1 (newest first) whatever the backlog, with the total
  const interestId = await createEmployerInterest(seeker.id, employer.companyId);
  await page.goto("/admin/matching");
  await expect(page.getByTestId("admin-matching")).toBeVisible();
  await expect(page.locator(`[data-interest-id="${interestId}"]`)).toBeVisible();
  await expect(page.getByTestId("matching-interests-range")).toContainText("최신순");
  await page.goto(`/admin/matching/${employer.postingId}`);
  const row = page.locator(`[data-seeker-id="${seeker.id}"]`);
  await expect(row).toBeVisible();
  await expect(page.getByTestId("match-candidates").locator("tbody tr")).toHaveCount(1);
  await p2cShot(page, info, "admin_matching");

  await waitForHydration(page, "recommend-open");
  await row.getByTestId("recommend-open").click();
  await page.getByTestId("recommend-confirm").click();
  // the page is revalidated: the row now links to the recommendation (no second 추천 실행 button)
  const recLink = row.getByTestId("already-recommended");
  await expect(recLink).toBeVisible();
  const recs = await recommendationsOf(seeker.id);
  expect(recs).toHaveLength(1);
  expect(recs[0].staffId).toBe(staffId);

  await recLink.click();
  await expect(page).toHaveURL(new RegExp(`/admin/matching/recommendations/${recs[0].id}$`));
  await waitForHydration(page, "interview-create-form");
  await p2cShot(page, info, "r2_admin_forms");
  await page.getByLabel("일시 (한국 시간)").fill("2026-12-10T14:00");
  await page.getByLabel("장소 (기업에 보임, 연락처 금지)").fill("본사 회의실");
  await page.getByTestId("interview-create").click();
  const item = page.getByTestId("interview-item");
  await expect(item).toHaveAttribute("data-status", "SCHEDULED");

  await waitForHydration(page, "interview-confirm");
  await page.getByTestId("interview-confirm").click();
  await expect(item).toHaveAttribute("data-status", "CONFIRMED");
  await expect(item).toHaveAttribute("data-consent", "PENDING");

  // R-210 / P2c QA O-2: a file over INTRO_CONFIRM_MAX_BYTES is refused as soon as it is chosen
  await waitForHydration(page, "intro-upload-form");
  const fileInput = item.locator('input[type="file"]');
  const big = Buffer.alloc(INTRO_CONFIRM_MAX_BYTES + 1, 0x20);
  PDF.copy(big);
  await fileInput.setInputFiles({ name: "big.pdf", mimeType: "application/pdf", buffer: big });
  await expect(item.getByTestId("action-error")).toHaveAttribute("data-code", "FILE_TOO_LARGE");
  await expect(item.getByTestId("intro-upload")).toBeDisabled();
  await p2cShot(page, info, "r2_upload_too_large");

  // a request the server refuses before the action (body over SERVER_ACTION_BODY_LIMIT) → a plain
  // error line, not the "Application error" screen
  await fileInput.setInputFiles({ name: "intro.pdf", mimeType: "application/pdf", buffer: PDF });
  await expect(item.getByTestId("action-error")).toHaveCount(0);
  const inflate = async (route: Route) => {
    const req = route.request();
    if (req.method() !== "POST" || !req.headers()["next-action"]) return route.continue();
    const body = req.postDataBuffer() ?? Buffer.alloc(0);
    return route.continue({
      postData: Buffer.concat([body, Buffer.alloc(SERVER_ACTION_BODY_LIMIT + 1024, 0x20)]),
    });
  };
  await page.route("**/admin/matching/recommendations/**", inflate);
  await item.getByTestId("intro-upload").click();
  await expect(item.getByTestId("action-error")).toHaveAttribute("data-code", "UPLOAD_FAILED");
  await expect(page.getByText("Application error")).toHaveCount(0);
  await page.unroute("**/admin/matching/recommendations/**", inflate);
  expect((await interviewsOf(recs[0].id))[0].introConfirmFile).toBeNull();

  // R-210 upload (bytes checked on the server) → open through a fresh signed link
  await fileInput.setInputFiles({
    name: "intro.pdf",
    mimeType: "application/pdf",
    buffer: PDF,
  });
  await item.getByTestId("intro-upload").click();
  await expect(item.getByTestId("intro-uploaded")).toBeVisible();
  const [iv] = await interviewsOf(recs[0].id);
  expect(iv.introConfirmFile).toMatch(/^intro-confirm\//);
  await p2cShot(page, info, "admin_recommendation");

  await waitForHydration(page, "intro-open");
  const download = page.waitForEvent("download");
  await item.getByTestId("intro-open").click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^intro-confirm-.+\.pdf$/);

  // nothing is served from public/: the stored key is not a public URL
  const res = await page.request.get(`/${iv.introConfirmFile}`);
  expect(res.status()).not.toBe(200);

  // 면접 취소 asks first (cannot be undone); closing the dialog changes nothing
  await waitForHydration(page, "interview-cancel");
  await item.getByTestId("interview-cancel").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("되돌릴 수 없습니다");
  await p2cShot(page, info, "r2_cancel_dialog");
  await dialog.getByRole("button", { name: "닫기" }).first().click();
  await expect(dialog).toHaveCount(0);
  expect((await interviewsOf(recs[0].id))[0].status).toBe("CONFIRMED");
  await item.getByTestId("interview-cancel").click();
  await page.getByTestId("interview-cancel-confirm").click();
  await expect(item).toHaveAttribute("data-status", "CANCELLED");
  expect((await interviewsOf(recs[0].id))[0].status).toBe("CANCELLED");
});

test("R-216: STAFF_PLACEMENT is refused 체류 사건; STAFF_VISA registers and edits one", async ({
  page,
  browser,
}, info) => {
  const visa = uniqueTag();
  const seeker = await createMatchSeeker(uniquePhone(), visa, uniqueName());

  await signInNewStaff(page, "STAFF_VISA");
  await page.goto(`/admin/visa-cases?seekerId=${seeker.id}`);
  await waitForHydration(page, "visa-case-create-form");
  await page.getByTestId("visa-case-create").click();
  await expect(page.getByTestId("action-ok")).toBeVisible();
  const [created] = await visaCasesOf(seeker.id);
  expect(created.status).toBe("OPEN");
  // BR-13: no identification-number input anywhere on the form
  await expect(page.getByLabel(/여권|외국인등록번호/)).toHaveCount(0);
  await page.goto(`/admin/visa-cases/${created.id}`);
  await waitForHydration(page, "visa-case-edit-form");
  await page.getByLabel("진행 상태").selectOption("FILED");
  await page.getByTestId("visa-case-save").click();
  await expect(page.getByTestId("action-ok")).toBeVisible();
  expect((await visaCasesOf(seeker.id))[0].status).toBe("FILED");
  await page.reload();
  await p2cShot(page, info, "admin_visa_case");

  const placementContext = await browser.newContext({
    baseURL: `http://localhost:${process.env.E2E_PORT ?? 3100}`,
    viewport: page.viewportSize() ?? undefined,
  });
  const placementPage = await placementContext.newPage();
  await signInNewStaff(placementPage, "STAFF_PLACEMENT");
  for (const path of ["/admin/visa-cases", `/admin/visa-cases/${created.id}`]) {
    await placementPage.goto(path);
    await expect(placementPage.getByTestId("admin-forbidden")).toBeVisible();
    await expect(placementPage.getByTestId("visa-case-status")).toHaveCount(0);
    await expect(placementPage.getByTestId("visa-case-table")).toHaveCount(0);
  }
  await placementContext.close();
});
