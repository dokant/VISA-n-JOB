/**
 * R-207 면접 요청: InterestRequest(initiator EMPLOYER) + one StaffTask INTEREST_FOLLOWUP for the
 * placement staff, deduplicated per company + seeker; only verified + contracted companies; only
 * candidates that are still eligible; the result carries no seeker data (BR-01, R-206).
 */
import { afterAll, describe, expect, it } from "vitest";

import {
  EMPLOYER_INTEREST_STAFF_TEMPLATE,
  employerInterestDedupeKey,
  requestCandidateInterview,
  requestedPublicIds,
} from "@/lib/candidates/interest";
import { db } from "@/lib/db";
import type { NotificationMessage, NotificationProvider } from "@/lib/notifications";
import { toBlindPublicId } from "@/lib/serializers/blindSeeker";

import { candidate, company, tag } from "./candidateFixtures";

afterAll(() => db.$disconnect());

function capture(): NotificationProvider & { sent: NotificationMessage[] } {
  const sent: NotificationMessage[] = [];
  return {
    name: "capture",
    sent,
    async send(message: NotificationMessage) {
      sent.push(message);
      return {
        ok: true as const,
        provider: "capture",
        id: String(sent.length),
        delivery: "SIMULATED" as const,
      };
    },
  };
}

describe("R-207 requestCandidateInterview", () => {
  it("R-207: creates InterestRequest(EMPLOYER) + one staff task, a second click changes nothing", async () => {
    const seeker = await candidate(tag("iv"));
    const c = await company({ verified: true, contracted: true });
    const provider = capture();
    const publicId = toBlindPublicId(seeker.publicId);

    const r = await requestCandidateInterview({ actor: c, publicId, locale: "ko", provider });
    expect(r).toEqual({ ok: true, already: false });
    // no seeker id, name or contact in the result
    expect(JSON.stringify(r)).not.toContain(seeker.id);

    const requests = await db.interestRequest.findMany({ where: { companyId: c.companyId } });
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      initiator: "EMPLOYER",
      seekerId: seeker.id,
      postingId: null,
      status: "RECEIVED",
    });
    const tasks = await db.staffTask.findMany({ where: { companyId: c.companyId } });
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      type: "INTEREST_FOLLOWUP",
      assigneeRole: "STAFF_PLACEMENT",
      seekerId: seeker.id,
      dedupeKey: employerInterestDedupeKey(c.companyId, seeker.id),
      payload: { initiator: "EMPLOYER", interestRequestId: requests[0].id },
    });
    expect(provider.sent).toHaveLength(1);
    expect(provider.sent[0]).toMatchObject({
      channel: "STAFF",
      templateKey: EMPLOYER_INTEREST_STAFF_TEMPLATE,
    });

    expect(await requestCandidateInterview({ actor: c, publicId, locale: "ko", provider })).toEqual(
      { ok: true, already: true },
    );
    expect(await db.interestRequest.count({ where: { companyId: c.companyId } })).toBe(1);
    expect(provider.sent).toHaveLength(1);
    expect(await requestedPublicIds(c.companyId)).toEqual(new Set([publicId]));
  });

  it("refused for a company without verification or contract (NOT_CONTRACTED)", async () => {
    const seeker = await candidate(tag("iv-nc"));
    for (const opts of [{ verified: true }, { contracted: true }]) {
      const c = await company(opts);
      const r = await requestCandidateInterview({
        actor: c,
        publicId: toBlindPublicId(seeker.publicId),
        locale: "ko",
        provider: capture(),
      });
      expect(r).toEqual({ ok: false, code: "NOT_CONTRACTED" });
      expect(await db.interestRequest.count({ where: { companyId: c.companyId } })).toBe(0);
    }
  });

  it("WO15-06 / WO15-08: E-9, revoked BLIND_PROFILE and unknown ids are NOT_FOUND", async () => {
    const t = tag("iv-nf");
    const e9 = await candidate(t, { visaCode: "E-9", track: "FUTURE_POOL" });
    const revoked = await candidate(t, { blindProfile: "REVOKED" });
    const c = await company({ verified: true, contracted: true });
    for (const publicId of [
      toBlindPublicId(e9.publicId),
      toBlindPublicId(revoked.publicId),
      "b".repeat(32),
      "not-a-blind-id",
    ]) {
      const r = await requestCandidateInterview({
        actor: c,
        publicId,
        locale: "ko",
        provider: capture(),
      });
      expect(r).toEqual({ ok: false, code: "NOT_FOUND" });
    }
    expect(await db.interestRequest.count({ where: { companyId: c.companyId } })).toBe(0);
  });
});
