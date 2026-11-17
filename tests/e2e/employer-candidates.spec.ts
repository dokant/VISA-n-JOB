import { type Page, expect, test } from "@playwright/test";

import { detectContacts } from "@/lib/pii-guard";
import { toBlindPublicId } from "@/lib/serializers/blindSeeker";

import { signInNewStaff } from "./support/adminDb";
import {
  HIDDEN_EMAIL,
  HIDDEN_NAME,
  candidateViewAudits,
  candidatesURL,
  companyAudits,
  companyRow,
  createCandidate,
  createCandidateEmployer,
  e2eTag,
  employerInterestRequests,
  loginEmployer,
} from "./support/candidatesDb";
import { msg } from "./support/messages";
import { isolate, waitForHydration } from "./support/seekerFlow";

// P2b: R-205 blind candidates (FEATURE_EMPLOYER_CANDIDATES), R-207 면접 요청, R-208 계약 동의,
// R-218 관리자 기업 검증. Checks read the database (no reliance on what earlier runs left behind).
test.beforeEach(async ({ page }) => isolate(page));

async function noHorizontalScroll(page: Page) {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll).toBeLessThanOrEqual(client);
}

/** WO §15-2 on the screen: no phone / e-mail pattern and no hidden seeker value in <main>. */
async function noContacts(page: Page) {
  const text = await page.locator("main").innerText();
  const found = detectContacts(text).filter((m) =>
    ["PHONE_LOCAL", "PHONE_INTL", "EMAIL"].includes(m.type),
  );
  expect(found).toEqual([]);
  for (const hidden of [HIDDEN_NAME, HIDDEN_EMAIL, "Hidden Employer Co", "free text major"]) {
    expect(text).not.toContain(hidden);
  }
  expect(text).not.toMatch(/지원하기|Apply/);
}

test.describe("SC-07 flag off (default server)", () => {
  test.use({ baseURL: `http://localhost:${process.env.E2E_PORT ?? 3100}` });

  test("R-205: /employer/candidates is ComingSoon (200, noindex) and the API answers 404", async ({
    page,
    request,
  }) => {
    const res = await page.goto("/ko/employer/candidates");
    expect(res?.status()).toBe(200);
    await expect(page.getByTestId("coming-soon")).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    expect((await request.get("/api/employer/candidates")).status()).toBe(404);
    // no link to the candidate list anywhere on the public chrome
    await page.goto("/ko");
    await expect(page.locator('a[href*="/employer/candidates"]')).toHaveCount(0);
  });
});

test.describe("R-205 / R-207 /employer/candidates (flag on)", () => {
  test.use({ baseURL: candidatesURL() });

  test("needs an employer sign-in", async ({ page }) => {
    await page.goto("/ko/employer/candidates");
    await expect(page).toHaveURL(/\/ko\/employer\/login\?next=(%2F|\/)employer(%2F|\/)candidates$/);
  });

  test("R-205 / R-218: a company without verification or contract sees the summary only", async ({
    page,
  }) => {
    const tag = e2eTag();
    await createCandidate(tag);
    const { email } = await createCandidateEmployer({ verified: false, contracted: false });
    await loginEmployer(page, email, "/employer/candidates");
    await expect(page.getByTestId("candidate-stats")).toBeVisible();
    await expect(page.getByTestId("access-unverified")).toHaveText(
      msg("ko", "employer.candidates.stats.unverified"),
    );
    await expect(page.getByTestId("contract-link")).toHaveAttribute(
      "href",
      /\/ko\/employer\/contract$/,
    );
    await expect(page.getByTestId("candidate-card")).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await noContacts(page);
    await noHorizontalScroll(page);
  });

  test("R-205 / R-207 / WO15-06: blind list (E-9 excluded), 면접 요청, view logged", async ({
    page,
  }) => {
    const tag = e2eTag();
    const s = await createCandidate(tag, { grade: "S" });
    const a = await createCandidate(tag);
    const e9 = await createCandidate(tag, { visaCode: "E-9", track: "FUTURE_POOL" });
    const { email, companyId } = await createCandidateEmployer({
      verified: true,
      contracted: true,
    });
    await loginEmployer(page, email, `/employer/candidates?convertible=${tag}`);

    const cards = page.getByTestId("candidate-card");
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0)).toHaveAttribute("data-public-id", toBlindPublicId(s.publicId));
    await expect(cards.nth(1)).toHaveAttribute("data-public-id", toBlindPublicId(a.publicId));
    await expect(page.locator(`[data-public-id="${toBlindPublicId(e9.publicId)}"]`)).toHaveCount(0);
    await expect(cards.nth(0).getByTestId("grade-badge")).toHaveAttribute("data-grade", "S");
    await expect(page.getByTestId("notice-box")).toHaveText(
      msg("ko", "employer.candidates.notice"),
    );
    await expect(page.getByTestId("candidate-filters").locator("select")).toHaveCount(8);
    await noContacts(page);
    await noHorizontalScroll(page);

    // the view was logged (PC-12) with the shown public ids
    const audits = await candidateViewAudits(companyId);
    expect(audits.length).toBeGreaterThanOrEqual(1);
    expect(audits.at(-1)?.meta).toMatchObject({
      filters: { convertible: tag },
      resultCount: 2,
    });

    // 면접 요청 → VISA n JOB (InterestRequest EMPLOYER), never the seeker
    await waitForHydration(page, "interview-form");
    const first = cards.nth(0);
    await first
      .getByRole("button", { name: msg("ko", "employer.candidates.interview.cta") })
      .click();
    await expect(first.getByTestId("interview-requested")).toContainText(
      msg("ko", "employer.candidates.interview.done"),
    );
    expect(await employerInterestRequests(companyId)).toEqual([
      { seekerId: s.id, status: "RECEIVED" },
    ]);
    // after a reload the card says it was requested
    await page.reload();
    await expect(
      page
        .locator(`[data-public-id="${toBlindPublicId(s.publicId)}"]`)
        .getByTestId("interview-requested"),
    ).toBeVisible();
  });

  test("filters narrow the list (GET form keeps the values)", async ({ page }) => {
    const tag = e2eTag();
    await createCandidate(tag, { visaCode: "H-2" });
    await createCandidate(tag);
    const { email } = await createCandidateEmployer({ verified: true, contracted: true });
    await loginEmployer(page, email, `/employer/candidates?convertible=${tag}`);
    await expect(page.getByTestId("candidate-card")).toHaveCount(2);
    await page.goto(`/ko/employer/candidates?convertible=${tag}&visa=H-2`);
    await expect(page.getByTestId("candidate-card")).toHaveCount(1);
    await expect(page.locator("#filter-visa")).toHaveValue("H-2");
  });
});

test.describe("R-208 /employer/contract", () => {
  test.use({ baseURL: candidatesURL() });

  test("R-208: terms required, mandate optional — the contract completes without it", async ({
    page,
    request,
  }) => {
    const { email, companyId } = await createCandidateEmployer();
    await loginEmployer(page, email, "/employer/contract");
    const doc = page.getByTestId("terms-document");
    await expect(doc.getByTestId("expert-review")).toContainText(
      msg("ko", "common.expertReview.label"),
    );
    const pdf = await page.getByTestId("terms-pdf").locator("a").first().getAttribute("href");
    expect(pdf).toMatch(/^\/docs\/employer-terms-v1-ko\.pdf$/);
    const pdfRes = await request.get(pdf as string);
    expect(pdfRes.status()).toBe(200);
    expect(pdfRes.headers()["content-type"]).toContain("application/pdf");

    await waitForHydration(page, "contract-form");
    await page.getByTestId("contract-submit").click();
    await expect(page.getByText(msg("ko", "employer.contract.error.termsRequired"))).toBeVisible();
    await expect(page.getByTestId("contract-terms")).toBeFocused();
    expect((await companyRow(companyId)).contractSignedAt).toBeNull();

    await page.getByTestId("contract-terms").click();
    await page.getByTestId("contract-submit").click();
    await expect(page.getByTestId("contract-signed")).toBeVisible();
    await expect(page.getByTestId("contract-mandate-status")).toHaveText(
      msg("ko", "employer.contract.signed.mandateNo"),
    );
    const row = await companyRow(companyId);
    expect(row.contractSignedAt).not.toBeNull();
    expect(row).toMatchObject({ contractVersion: "v1", visaMandateAgreed: false });
    await noHorizontalScroll(page);
  });

  test("SC-08: a translated page shows the Korean original and both PDFs", async ({ page }) => {
    const { email } = await createCandidateEmployer();
    await loginEmployer(page, email, "/employer/contract");
    await page.goto("/en/employer/contract");
    const doc = page.getByTestId("terms-document");
    await expect(doc).toContainText("Korean original");
    await expect(doc).toContainText("구인 서비스 이용약관 (기업용)");
    await expect(page.getByTestId("terms-pdf").locator("a")).toHaveCount(2);
  });
});

test.describe("R-218 /admin/companies", () => {
  test.use({ baseURL: `http://localhost:${process.env.E2E_PORT ?? 3100}` });

  test("R-218: STAFF_PLACEMENT verifies and records the contract; each change is audited", async ({
    page,
  }) => {
    const { companyId } = await createCandidateEmployer();
    await signInNewStaff(page, "STAFF_PLACEMENT");
    await page.goto("/admin/companies");
    const row = page.locator(`tr[data-company-id="${companyId}"]`);
    await expect(row).toContainText("이투이 후보 열람 제조");
    await expect(row.getByTestId("company-unverified")).toBeVisible();
    await waitForHydration(page, "company-verify-form");
    await row.getByTestId("company-verify").click();
    await expect(row.getByTestId("company-verified")).toBeVisible();
    await row.getByTestId("company-contract-set").click();
    await expect(row.getByTestId("company-contracted")).toBeVisible();
    const company = await companyRow(companyId);
    expect(company.verified).toBe(true);
    expect(company.contractSignedAt).not.toBeNull();
    expect(
      (await companyAudits(companyId)).map((a) => (a.meta as { change: string }).change),
    ).toEqual(["VERIFY", "CONTRACT_SET"]);
  });

  test("Q-08: STAFF_VISA cannot verify companies", async ({ page }) => {
    await signInNewStaff(page, "STAFF_VISA");
    await page.goto("/admin/companies");
    await expect(page.getByTestId("company-table")).toHaveCount(0);
    await expect(page.locator("main")).toContainText("매칭 담당 직원과 관리자만");
  });
});
