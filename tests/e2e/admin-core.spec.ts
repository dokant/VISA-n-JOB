import { expect, test } from "@playwright/test";

import { uniqueIp } from "./support/authDb";
import {
  auditFor,
  callCount,
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
    // STANDARD 1.1 (E-2): 칸반 열 제목은 "리드 등급"으로 구분.
    await expect(page.locator("#col-C")).toContainText("리드 등급 C");

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

  test("R-121 / Q-14: 고용 의사 없음 → 확인 다이얼로그(취소 시 변경 없음) → 재접촉금지 + AuditLog", async ({
    page,
  }) => {
    const staffId = await signInNewStaff(page, "STAFF_PLACEMENT");
    const leadId = await createCallLead();

    await page.goto(`/admin/leads/${leadId}`);
    await waitForHydration(page, "call-form");
    await page.getByLabel(/통화 결과/).selectOption("NO_INTENT");
    await expect(page.getByLabel(/통화 결과/)).toContainText("재접촉금지로 이동");
    await page.getByTestId("call-save").click();
    const dialog = page.getByTestId("call-final-confirm");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("되돌릴 수 없");

    // Cancel: nothing is stored.
    await page.getByTestId("call-final-cancel").click();
    await expect(dialog).toHaveCount(0);
    expect((await leadGrade(leadId)).grade).toBe("C");
    expect(await auditFor(leadId, "LEAD_GRADE_CHANGE")).toHaveLength(0);

    // Confirm: DO_NOT_CONTACT with LEAD_GRADE_CHANGE (CALL_NO_INTENT).
    await page.getByTestId("call-save").click();
    await expect(dialog).toBeVisible();
    await page.getByTestId("call-final-confirm-submit").click();
    await expect(page.getByTestId("lead-grade")).toHaveAttribute("data-grade", "DO_NOT_CONTACT");
    await expect(page.getByTestId("call-form")).toHaveCount(0);
    expect((await leadGrade(leadId)).grade).toBe("DO_NOT_CONTACT");
    const audit = await auditFor(leadId, "LEAD_GRADE_CHANGE");
    expect(audit.map((a) => [a.actorId, a.meta])).toEqual([
      [staffId, { from: "C", to: "DO_NOT_CONTACT", reason: "CALL_NO_INTENT" }],
    ]);
  });

  test("R-121 / Q-16: 보관 리드 → 재접촉 거부 → 확인 → 재접촉금지 + CallLog + AuditLog (서버 오류 없음)", async ({
    page,
  }) => {
    const staffId = await signInNewStaff(page, "STAFF_PLACEMENT");
    const leadId = await createCallLead("ARCHIVED");

    await page.goto(`/admin/leads/${leadId}`);
    await waitForHydration(page, "call-form");
    await page.getByLabel(/통화 결과/).selectOption("DNC");
    await page.getByTestId("call-save").click();
    await expect(page.getByTestId("call-final-confirm")).toBeVisible();
    await page.getByTestId("call-final-confirm-submit").click();
    await expect(page.getByTestId("lead-grade")).toHaveAttribute("data-grade", "DO_NOT_CONTACT");
    await expect(page.getByTestId("call-form")).toHaveCount(0);
    await expect(page.getByText("Application error")).toHaveCount(0);
    expect((await leadGrade(leadId)).grade).toBe("DO_NOT_CONTACT");
    expect(await callCount(leadId)).toBe(1);
    const audit = await auditFor(leadId, "LEAD_GRADE_CHANGE");
    expect(audit.map((a) => [a.actorId, a.meta])).toEqual([
      [staffId, { from: "ARCHIVED", to: "DO_NOT_CONTACT", reason: "CALL_DNC" }],
    ]);
  });
});
