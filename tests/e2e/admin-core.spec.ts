import { expect, test } from "@playwright/test";

import { uniqueIp } from "./support/authDb";
import {
  auditFor,
  createCallLead,
  createReviewSeeker,
  leadGrade,
  signInNewStaff,
} from "./support/adminDb";
import { waitForHydration } from "./support/seekerFlow";

// P1e: R-119 dashboard, R-120 seeker review, R-121 lead kanban + calls, R-122 PII_VIEW.
// Origin "localhost" for the session cookie (same reason as auth.spec.ts).
test.use({ baseURL: `http://localhost:${process.env.E2E_PORT ?? 3100}` });
test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": uniqueIp() });
});

test.describe("P1e admin core", () => {
  test("R-119/R-120/R-122: 비자 담당 직원 2FA → 대시보드 → 조건 미충족 거부 → 승격 → AuditLog", async ({
    page,
  }) => {
    const staffId = await signInNewStaff(page, "STAFF_VISA");
    await expect(page.getByTestId("admin-dashboard")).toBeVisible();
    for (const key of ["newSeekers", "callLeads", "interviewsToday", "expiringSoon"]) {
      await expect(page.getByTestId(`count-${key}`)).toHaveText(/^\d+$/);
    }
    await expect(page.getByTestId("admin-actor")).toContainText("비자 담당");

    // Unmet promotion is refused on the server.
    const blocked = await createReviewSeeker({ consulted: true });
    await page.goto(`/admin/seekers/${blocked}`);
    await waitForHydration(page, "grade-form");
    await page.getByTestId("promote-A").click();
    await expect(page.getByTestId("action-error")).toContainText("체류자격 확인");
    await expect(page.getByTestId("seeker-grade")).toHaveText("B등급");
    expect(await auditFor(blocked, "SEEKER_GRADE_CHANGE")).toHaveLength(0);

    // Conditions met → B→A with an AuditLog row by this staff member.
    const ready = await createReviewSeeker({ consulted: true, verifiedVisa: true });
    await page.goto(`/admin/seekers/${ready}`);
    await waitForHydration(page, "grade-form");
    await page.getByTestId("promote-A").click();
    await expect(page.getByTestId("seeker-grade")).toHaveText("A등급");
    await expect
      .poll(async () => (await auditFor(ready, "SEEKER_GRADE_CHANGE")).map((r) => r.actorId))
      .toEqual([staffId]);

    // STAFF_VISA cannot open contacts; the basic PII reveal writes PII_VIEW.
    await expect(page.getByTestId("reveal-contact")).toHaveCount(0);
    await waitForHydration(page, "reveal-basic");
    await page.getByTestId("reveal-basic").click();
    await expect(page.getByTestId("pii-basic-values")).toContainText("E2E REVIEW NAME");
    await expect.poll(async () => (await auditFor(ready, "PII_VIEW")).length).toBe(1);

    // No lead kanban for STAFF_VISA.
    await page.goto("/admin/leads");
    await expect(page.getByTestId("admin-forbidden")).toBeVisible();
  });

  test("R-121/R-122: 매칭 담당 직원 → 리드 통화 기록(관심 있음) → B 전이 + AuditLog, 연락처 열람 PII_VIEW", async ({
    page,
  }) => {
    const staffId = await signInNewStaff(page, "STAFF_PLACEMENT");
    const leadId = await createCallLead();

    await page.goto("/admin/leads");
    await expect(page.getByTestId("lead-board")).toBeVisible();
    await expect(
      page.getByTestId("lead-col-C").locator(`[data-lead-id="${leadId}"]`),
    ).toBeVisible();

    await page.goto(`/admin/leads/${leadId}`);
    await waitForHydration(page, "call-form");
    await page.getByLabel(/통화 결과/).selectOption("INTERESTED");
    await page.getByLabel(/메모/).fill("다음 주 견적 통화");
    await page.getByTestId("call-save").click();
    await expect(page.getByTestId("lead-grade")).toHaveAttribute("data-grade", "B");
    await expect(page.getByTestId("call-history")).toContainText("관심 있음");
    expect((await leadGrade(leadId)).grade).toBe("B");
    const audit = await auditFor(leadId, "LEAD_GRADE_CHANGE");
    expect(audit.map((a) => [a.actorId, a.meta])).toEqual([
      [staffId, { from: "C", to: "B", reason: "CALL_INTERESTED" }],
    ]);

    await waitForHydration(page, "reveal-lead-contact");
    await page.getByTestId("reveal-lead-contact").click();
    await expect(page.getByTestId("lead-contact-values")).toContainText("이투이 담당");
    await expect.poll(async () => (await auditFor(leadId, "PII_VIEW")).length).toBe(1);

    await page.goto("/admin/leads");
    await expect(
      page.getByTestId("lead-col-B").locator(`[data-lead-id="${leadId}"]`),
    ).toBeVisible();
  });
});
