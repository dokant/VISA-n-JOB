/**
 * R-203 면접 신청: a signed-in seeker creates InterestRequest(SEEKER) + a staff task, and the staff are
 * alerted (console adapter). Visa not in eligibleVisas → refused (the screen shows 상담 신청).
 * The request goes to the operator only (BR-01): nothing is sent to the company.
 */
import { afterAll, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import type { NotificationMessage, NotificationProvider } from "@/lib/notifications";
import {
  INTEREST_STAFF_TEMPLATE,
  interestStateFor,
  requestInterest,
} from "@/lib/postings/interest";

import { rawPosting, seekerUser } from "./postingFixtures";

afterAll(() => db.$disconnect());

function fakeProvider() {
  const sent: NotificationMessage[] = [];
  const provider: NotificationProvider = {
    name: "fake",
    send: vi.fn(async (m: NotificationMessage) => {
      sent.push(m);
      return { ok: true as const, provider: "fake", id: "1" };
    }),
  };
  return { sent, provider };
}

describe("R-203 면접 신청", () => {
  it("R-203: eligible seeker → InterestRequest(SEEKER) + INTEREST_FOLLOWUP task + staff alert", async () => {
    const { posting } = await rawPosting("A", { eligibleVisas: ["F-4", "H-2"] });
    const { user, profile } = await seekerUser("F-4");
    const { sent, provider } = fakeProvider();

    expect(
      await interestStateFor({
        userId: user.id,
        postingId: posting.id,
        eligibleVisas: posting.eligibleVisas,
      }),
    ).toBe("ELIGIBLE");
    const r = await requestInterest({
      userId: user.id,
      postingId: posting.id,
      locale: "vi",
      provider,
    });
    expect(r).toMatchObject({ ok: true, already: false });

    const requests = await db.interestRequest.findMany({ where: { seekerId: profile.id } });
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      initiator: "SEEKER",
      postingId: posting.id,
      companyId: posting.companyId,
      status: "RECEIVED",
    });
    const tasks = await db.staffTask.findMany({ where: { seekerId: profile.id } });
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      type: "INTEREST_FOLLOWUP",
      status: "OPEN",
      assigneeRole: "STAFF_PLACEMENT",
    });
    expect(tasks[0].payload).toEqual({
      initiator: "SEEKER",
      postingId: posting.id,
      interestRequestId: requests[0].id,
    });

    // Staff alert only: channel STAFF, ids only, never the company and never personal data.
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ channel: "STAFF", templateKey: INTEREST_STAFF_TEMPLATE });
    expect(sent[0].to).toBe("role:STAFF_PLACEMENT");
    expect(sent[0].params).toEqual({ taskId: tasks[0].id, postingId: posting.id });

    expect(
      await interestStateFor({
        userId: user.id,
        postingId: posting.id,
        eligibleVisas: posting.eligibleVisas,
      }),
    ).toBe("REQUESTED");
  });

  it("R-203: a second request is idempotent (no second row, no second alert)", async () => {
    const { posting } = await rawPosting("A", { eligibleVisas: ["F-4"] });
    const { user, profile } = await seekerUser("F-4");
    const { sent, provider } = fakeProvider();
    await requestInterest({ userId: user.id, postingId: posting.id, locale: "ko", provider });
    const again = await Promise.all([
      requestInterest({ userId: user.id, postingId: posting.id, locale: "ko", provider }),
      requestInterest({ userId: user.id, postingId: posting.id, locale: "ko", provider }),
    ]);
    for (const r of again) expect(r).toEqual({ ok: true, already: true });
    expect(await db.interestRequest.count({ where: { seekerId: profile.id } })).toBe(1);
    expect(sent).toHaveLength(1);
  });

  it("R-203 / WO §8.5: visa not in eligibleVisas (or no visa) → NOT_ELIGIBLE, nothing created", async () => {
    const { posting } = await rawPosting("A", { eligibleVisas: ["F-4"] });
    for (const visa of ["E-9", null]) {
      const { user, profile } = await seekerUser(visa);
      const { sent, provider } = fakeProvider();
      expect(
        await interestStateFor({
          userId: user.id,
          postingId: posting.id,
          eligibleVisas: posting.eligibleVisas,
        }),
      ).toBe("NOT_ELIGIBLE");
      expect(
        await requestInterest({ userId: user.id, postingId: posting.id, locale: "ko", provider }),
      ).toEqual({ ok: false, code: "NOT_ELIGIBLE" });
      expect(await db.interestRequest.count({ where: { seekerId: profile.id } })).toBe(0);
      expect(await db.staffTask.count({ where: { seekerId: profile.id } })).toBe(0);
      expect(sent).toHaveLength(0);
    }
  });

  it("R-203: a blocked seeker is refused", async () => {
    const { posting } = await rawPosting("A", { eligibleVisas: ["F-4"] });
    const { user } = await seekerUser("F-4", { status: "BLOCKED" });
    expect(await requestInterest({ userId: user.id, postingId: posting.id, locale: "ko" })).toEqual(
      { ok: false, code: "BLOCKED" },
    );
  });

  it("WO15-03: postings that are not public (C·B lead, DRAFT) cannot be requested", async () => {
    const { user } = await seekerUser("F-4");
    for (const p of [
      await rawPosting("B"),
      await rawPosting("C"),
      await rawPosting("A", { status: "DRAFT", publishedAt: null }),
    ]) {
      expect(
        await requestInterest({ userId: user.id, postingId: p.posting.id, locale: "ko" }),
      ).toEqual({ ok: false, code: "NOT_FOUND" });
    }
  });
});
