import { expect, test } from "@playwright/test";

import { auditFor, signInNewStaff } from "./support/adminDb";
import { uniquePhone } from "./support/authDb";
import {
  E2E_COMPANY,
  createLead,
  createPublicPosting,
  createSeekerWithVisa,
  followupTasksOf,
  interestRequestsOf,
  jobsURL,
  postingOf,
  shot,
  updateSeeker,
} from "./support/jobsDb";
import { msg } from "./support/messages";
import { seekerProfileByPhone } from "./support/seekerDb";
import { agree, isolate, loginUi, verifyPhone, waitForHydration } from "./support/seekerFlow";

// P2a: R-201 blind postings (admin), R-202 /jobs (flag), R-203 면접 신청 (three cases), R-015 / SC-07.
test.beforeEach(async ({ page }) => isolate(page));

test.describe("SC-07 / R-015 flag off (default server)", () => {
  test.use({ baseURL: `http://localhost:${process.env.E2E_PORT ?? 3100}` });

  test("/jobs and /jobs/[id] are ComingSoon 200 + noindex, no nav link, API 404", async ({
    page,
    request,
  }) => {
    const postingId = await createPublicPosting();
    for (const path of ["/ko/jobs", `/vi/jobs/${postingId}`]) {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.getByTestId("coming-soon")).toBeVisible();
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      await expect(page.getByTestId("posting-card")).toHaveCount(0);
      await expect(page.getByTestId("interest-panel")).toHaveCount(0);
    }
    await page.goto("/ko");
    await expect(page.locator('a[href="/ko/jobs"]')).toHaveCount(0);
    expect((await request.get("/api/jobs")).status()).toBe(404);
    expect((await request.get(`/api/jobs/${postingId}`)).status()).toBe(404);
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).not.toContain("/jobs");
  });
});

test.describe("R-201 admin blind postings (flag-on server)", () => {
  test.use({ baseURL: jobsURL() });

  test("R-201: A lead → 작성 → 검증 전 공개 거부 → 검증 → 공개(AuditLog) → /jobs 노출", async ({
    page,
  }, testInfo) => {
    const staffId = await signInNewStaff(page, "STAFF_PLACEMENT");
    const leadId = await createLead("A");
    const cLead = await createLead("C");

    // A C lead cannot open the form (and the server action refuses it — unit tests).
    await page.goto(`/admin/postings/new?leadId=${cLead}`);
    await expect(page.getByTestId("admin-forbidden")).toContainText("리드 등급 A");

    await page.goto("/admin/postings");
    await expect(page.getByTestId("admin-postings")).toBeVisible();
    await expect(page.locator(`[data-lead-id="${leadId}"]`)).toBeVisible();
    await shot(page, testInfo, "admin_postings");

    await page.goto(`/admin/postings/new?leadId=${leadId}`);
    await waitForHydration(page, "posting-create-form");
    const title = `서울 제조업 생산직 관리자 E2E ${Date.now().toString(36)}`;
    await page.getByLabel(/블라인드 제목/).fill(title);
    await page.getByLabel(/^직무/).fill("생산직");
    await page.getByLabel(/채용 인원/).fill("2");
    await page.getByLabel(/^숙소/).selectOption("FREE");
    await page.getByTestId("visa-F-4").click();
    await shot(page, testInfo, "admin_posting_new");

    // The company name in the public text is refused (BR-03).
    await page.getByLabel(/블라인드 제목/).fill("이투이공고정밀 생산직");
    await page.getByTestId("posting-create-submit").click();
    await expect(page.getByTestId("action-error")).toHaveAttribute("data-code", "TEXT_HAS_COMPANY");
    await page.getByLabel(/블라인드 제목/).fill(title);
    await page.getByTestId("posting-create-submit").click();
    await expect(page).toHaveURL(/\/admin\/postings\/(?!new)[a-z0-9]+$/);
    const postingId = page.url().split("/").pop() as string;
    await expect(page.getByTestId("posting-status")).toHaveAttribute("data-status", "DRAFT");

    // WO §15-4: publishing before verification is refused on the server.
    await waitForHydration(page, "posting-publish");
    await page.getByTestId("posting-publish").click();
    await expect(
      page.getByTestId("posting-publish-form").getByTestId("action-error"),
    ).toHaveAttribute("data-code", "NOT_VERIFIED");
    expect((await postingOf(postingId)).status).toBe("DRAFT");

    await page.getByTestId("posting-verify").click();
    await expect(page.getByTestId("posting-verified")).toHaveText("검증 완료");
    await waitForHydration(page, "posting-publish");
    await page.getByTestId("posting-publish").click();
    await expect(page.getByTestId("posting-status")).toHaveAttribute("data-status", "PUBLISHED");
    const row = await postingOf(postingId);
    expect(row.verifiedBy).toBe(staffId);
    expect(row.verifiedAt).not.toBeNull();
    await expect
      .poll(async () => (await auditFor(postingId, "POSTING_PUBLISH")).map((r) => r.actorId))
      .toEqual([staffId]);
    await shot(page, testInfo, "admin_posting_detail");

    await page.goto(`/ko/jobs/${postingId}`);
    await expect(page.getByTestId("job-detail")).toBeVisible();
    await expect(page.locator("h1")).toHaveText(title);
  });
});

test.describe("R-202 /jobs (flag-on server)", () => {
  test.use({ baseURL: jobsURL() });

  test("R-202 / WO15-03: only grade-A postings; no company data; no JobPosting schema", async ({
    page,
    request,
  }, testInfo) => {
    const a = await createPublicPosting({ title: `A 공고 ${Date.now().toString(36)}` });
    const b = await createPublicPosting({ leadGrade: "B" });
    const c = await createPublicPosting({ leadGrade: "C" });

    const res = await page.goto("/ko/jobs");
    expect(res?.status()).toBe(200);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    await expect(page.locator(`[data-posting-id="${a}"]`)).toBeVisible();
    await expect(page.locator(`[data-posting-id="${b}"]`)).toHaveCount(0);
    await expect(page.locator(`[data-posting-id="${c}"]`)).toHaveCount(0);
    await expect(page.getByTestId("notice-box")).toContainText(
      msg("ko", "public.jobs.operatorNote"),
    );
    const html = await page.content();
    expect(html).not.toContain("JobPosting");
    expect(html).not.toContain(E2E_COMPANY);
    expect(html).not.toContain("이투이공고정밀");
    expect(await page.locator("body").innerText()).not.toMatch(/지원하기|\bApply\b/i);
    await shot(page, testInfo, "jobs_list");

    expect((await page.goto(`/ko/jobs/${b}`))?.status()).toBe(404);
    expect((await page.goto(`/ko/jobs/${c}`))?.status()).toBe(404);

    const api = await request.get("/api/jobs");
    expect(api.status()).toBe(200);
    const body = await api.text();
    expect(body).toContain(a);
    expect(body).not.toContain(b);
    expect(body).not.toContain(E2E_COMPANY);
    expect(body).not.toMatch(/companyId|leadId|verifiedBy|contact|bizRegNo/);

    await page.goto(`/en/jobs/${a}`);
    await expect(page.getByTestId("verified-badge")).toHaveText(msg("en", "public.jobs.verified"));
    await expect(page.getByTestId("job-facts")).toContainText(
      msg("en", "public.jobs.shift.option.TWO_SHIFT"),
    );
    expect(await page.content()).not.toContain("JobPosting");
  });
});

test.describe("R-203 면접 신청 — three cases (flag-on server)", () => {
  test.use({ baseURL: jobsURL() });

  test("R-203 ①: signed-in seeker with an eligible visa → InterestRequest(SEEKER) + staff task", async ({
    page,
  }, testInfo) => {
    const postingId = await createPublicPosting({ eligibleVisas: ["F-4"] });
    const phone = uniquePhone();
    await createSeekerWithVisa(phone, "F-4");
    await loginUi(page, "ko", phone);

    await page.goto(`/ko/jobs/${postingId}`);
    const panel = page.getByTestId("interest-panel");
    await expect(panel).toHaveAttribute("data-state", "ELIGIBLE");
    await expect(panel.getByTestId("interest-how")).toHaveText(
      msg("ko", "public.jobs.interest.how"),
    );
    await waitForHydration(page, "interest-submit");
    await expect(page.getByTestId("interest-submit")).toHaveText(
      msg("ko", "public.jobs.interest.button"),
    );
    await page.getByTestId("interest-submit").click();
    await expect(page.getByTestId("interest-done")).toHaveText(
      msg("ko", "public.jobs.interest.done"),
    );
    await shot(page, testInfo, "interest_signed_in_done");

    await expect.poll(async () => (await interestRequestsOf(postingId)).length).toBe(1);
    expect((await interestRequestsOf(postingId))[0]).toMatchObject({
      initiator: "SEEKER",
      status: "RECEIVED",
    });
    expect(await followupTasksOf(postingId)).toEqual([
      { status: "OPEN", assigneeRole: "STAFF_PLACEMENT" },
    ]);

    // Reload: already requested, no second request.
    await page.reload();
    await expect(page.getByTestId("interest-panel")).toHaveAttribute("data-state", "REQUESTED");
    expect(await interestRequestsOf(postingId)).toHaveLength(1);
  });

  test("R-203 ②: visitor → 간편 등록 (?next=) → back on the posting → 면접 신청", async ({
    page,
  }, testInfo) => {
    const postingId = await createPublicPosting({ eligibleVisas: ["F-4"] });
    await page.goto(`/vi/jobs/${postingId}`);
    const panel = page.getByTestId("interest-panel");
    await expect(panel).toHaveAttribute("data-state", "ANONYMOUS");
    await expect(page.getByTestId("interest-register")).toHaveText(
      msg("vi", "public.jobs.interest.button"),
    );
    await shot(page, testInfo, "interest_anonymous");
    await page.getByTestId("interest-register").click();
    await expect(page).toHaveURL(
      new RegExp(`/vi/seeker/register/quick\\?next=%2Fjobs%2F${postingId}$`),
    );
    await expect(page.getByTestId("quick-next-notice")).toHaveText(
      msg("vi", "seeker.quick.nextNotice"),
    );

    const phone = uniquePhone();
    await waitForHydration(page, "quick-register-form");
    const form = page.getByTestId("quick-register-form");
    await form.locator('select[name="visaCode"]').selectOption("F-4");
    await form.locator('select[name="sido"]').selectOption({ index: 1 });
    await verifyPhone(page, "vi", phone);
    await agree(page, "PRIVACY_REQUIRED");
    await agree(page, "BLIND_PROFILE");
    await agree(page, "NOTICE");
    await page.getByTestId("quick-submit").click();
    await expect(page).toHaveURL(new RegExp(`/vi/jobs/${postingId}$`));

    await expect(page.getByTestId("interest-panel")).toHaveAttribute("data-state", "ELIGIBLE");
    await waitForHydration(page, "interest-submit");
    await page.getByTestId("interest-submit").click();
    await expect(page.getByTestId("interest-done")).toHaveText(
      msg("vi", "public.jobs.interest.done"),
    );
    const profile = await seekerProfileByPhone(phone);
    await expect
      .poll(async () => (await interestRequestsOf(postingId)).map((r) => r.seekerId))
      .toEqual([profile?.id]);
  });

  test("R-203 ③: visa not in eligibleVisas → 상담 신청 instead of 면접 신청", async ({
    page,
  }, testInfo) => {
    const postingId = await createPublicPosting({ eligibleVisas: ["F-4"] });
    const phone = uniquePhone();
    await createSeekerWithVisa(phone, "E-9");
    await loginUi(page, "en", phone);

    await page.goto(`/en/jobs/${postingId}`);
    const panel = page.getByTestId("interest-panel");
    await expect(panel).toHaveAttribute("data-state", "NOT_ELIGIBLE");
    await expect(page.getByTestId("interest-submit")).toHaveCount(0);
    await expect(page.getByTestId("interest-register")).toHaveCount(0);
    const consult = page.getByTestId("interest-consult");
    await expect(consult).toHaveText(msg("en", "common.consult"));
    await expect(consult).toHaveAttribute("href", /\/en\/about#contact$/);
    await expect(page.getByTestId("interest-not-eligible")).toContainText(
      msg("en", "public.jobs.interest.notEligibleTitle"),
    );
    // the "신청하면 … 연락드립니다" line does not belong to a request that cannot be made
    await expect(panel.getByTestId("interest-how")).toHaveCount(0);
    await shot(page, testInfo, "interest_consult");
    expect(await interestRequestsOf(postingId)).toHaveLength(0);
  });

  test("R-203: BLOCKED seeker → blocked notice + 상담 신청, no 면접 신청 and no request line", async ({
    page,
  }) => {
    const postingId = await createPublicPosting({ eligibleVisas: ["F-4"] });
    const phone = uniquePhone();
    const userId = await createSeekerWithVisa(phone, "F-4");
    await loginUi(page, "ko", phone);
    await updateSeeker(userId, { status: "BLOCKED" });

    await page.goto(`/ko/jobs/${postingId}`);
    const panel = page.getByTestId("interest-panel");
    await expect(panel).toHaveAttribute("data-state", "BLOCKED");
    await expect(page.getByTestId("interest-not-eligible")).toHaveText(
      msg("ko", "public.jobs.interest.blocked"),
    );
    await expect(page.getByTestId("interest-consult")).toHaveText(msg("ko", "common.consult"));
    await expect(page.getByTestId("interest-submit")).toHaveCount(0);
    await expect(panel.getByTestId("interest-how")).toHaveCount(0);
    expect(await interestRequestsOf(postingId)).toHaveLength(0);
  });

  test("QA O-2: visa changed after the page opened → server NOT_ELIGIBLE shows 상담 신청 in place", async ({
    page,
  }, testInfo) => {
    const postingId = await createPublicPosting({ eligibleVisas: ["F-4"] });
    const phone = uniquePhone();
    const userId = await createSeekerWithVisa(phone, "F-4");
    await loginUi(page, "ko", phone);

    await page.goto(`/ko/jobs/${postingId}`);
    const panel = page.getByTestId("interest-panel");
    await expect(panel).toHaveAttribute("data-state", "ELIGIBLE");
    await waitForHydration(page, "interest-submit");
    await updateSeeker(userId, { visaCode: "E-9" });
    await page.getByTestId("interest-submit").click();

    const notice = page.getByTestId("interest-not-eligible");
    await expect(notice).toHaveAttribute("data-code", "NOT_ELIGIBLE");
    await expect(notice).toContainText(msg("ko", "public.jobs.interest.notEligibleTitle"));
    const consult = page.getByTestId("interest-consult");
    await expect(consult).toHaveText(msg("ko", "common.consult"));
    await expect(consult).toHaveAttribute("href", /\/ko\/about#contact$/);
    await expect(page.getByTestId("interest-submit")).toHaveCount(0);
    await expect(panel.getByTestId("interest-how")).toHaveCount(0);
    await shot(page, testInfo, "interest_not_eligible_after_submit");
    expect(await interestRequestsOf(postingId)).toHaveLength(0);
  });
});
