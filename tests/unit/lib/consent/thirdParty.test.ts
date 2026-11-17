/**
 * R-211 (v1.1, DECISIONS PC-1): THIRD_PARTY_INTERVIEW 건별 동의.
 * - Before consent the company's screen data and API have no real name.
 * - After consent the name appears for THAT company and THAT interview only (another company,
 *   another interview of the same company, a not-yet-confirmed or cancelled interview: none).
 * - Contacts never appear, consented or not.
 * - Revocation (and decline) hides the name at once and writes CONSENT_REVOKE; every disclosure
 *   writes PII_VIEW.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { EmployerActor } from "@/lib/employer/session";
import {
  agreeInterviewConsent,
  declineInterviewConsent,
  listInterviewConsentRequests,
  revokeInterviewConsent,
} from "@/lib/consent/thirdParty";
import { db } from "@/lib/db";
import { loadEmployerRequests } from "@/lib/employer/interviews";
import { detectContacts } from "@/lib/pii-guard";
import { AuthzError } from "@/lib/rbac";
import { INTERVIEW_RESULTS, recordInterviewResult } from "@/lib/recommendations/interviews";
import {
  DISCLOSURE_ENDING_RESULTS,
  interviewEnded,
  loadInterviewDisclosure,
} from "@/lib/serializers/interviewDisclosure";

import { auditRows } from "../admin/adminFixtures";
import { LEAK_EMAIL, LEAK_MESSENGER, LEAK_NAME, company } from "../candidates/candidateFixtures";
import { matchSeeker, matchSetup, recommendedInterview } from "../recommendations/matchingFixtures";

const session = vi.hoisted(() => ({ actor: null as EmployerActor | null }));
vi.mock("@/lib/employer/session", () => ({
  requireEmployer: vi.fn(async () => {
    if (!session.actor) throw new AuthzError("UNAUTHENTICATED", 401, "no session");
    return session.actor;
  }),
  currentEmployer: vi.fn(async () => session.actor),
}));

const route = await import("@/app/api/employer/requests/route");

afterAll(() => db.$disconnect());
beforeEach(() => {
  session.actor = null;
});

async function apiText(actor: EmployerActor): Promise<string> {
  session.actor = actor;
  const res = await route.GET();
  expect(res.status).toBe(200);
  return res.text();
}

function names(data: Awaited<ReturnType<typeof loadEmployerRequests>>) {
  return data.recommendations.flatMap((r) =>
    r.interviews.map((i) => ({ id: i.interviewId, name: i.disclosure?.legalName ?? null })),
  );
}

async function phoneOf(userId: string) {
  return (await db.user.findUniqueOrThrow({ where: { id: userId } })).phoneEnc ?? "";
}

function noContacts(text: string, phone: string) {
  expect(
    detectContacts(text).filter((m) => ["PHONE_LOCAL", "PHONE_INTL", "EMAIL"].includes(m.type)),
  ).toEqual([]);
  for (const v of [phone, LEAK_EMAIL, LEAK_MESSENGER]) expect(text).not.toContain(v);
}

describe("R-211 THIRD_PARTY_INTERVIEW per-interview consent", () => {
  it("R-211: no name before consent; after consent only this company's this interview; never contacts", async () => {
    const setup = await matchSetup("C1");
    const s = await matchSeeker(setup);
    const phone = await phoneOf(s.userId);
    const { interview } = await recommendedInterview(setup, s.id, "CONFIRMED");
    const { interview: second } = await recommendedInterview(setup, s.id, "CONFIRMED");
    // same seeker recommended to a second company with its own confirmed interview
    const other = await matchSetup("C1b");
    const { interview: otherIv } = await recommendedInterview(
      { ...other, visa: setup.visa },
      s.id,
      "CONFIRMED",
    );
    const actor = { id: setup.employer.id, companyId: setup.employer.companyId };
    const otherActor = { id: other.employer.id, companyId: other.employer.companyId };

    // before consent: screen data and API have no name
    const before = await loadEmployerRequests(actor);
    expect(names(before).every((n) => n.name === null)).toBe(true);
    expect(JSON.stringify(before)).not.toContain(LEAK_NAME);
    expect(await apiText(actor)).not.toContain(LEAK_NAME);
    expect(before.recommendations.flatMap((r) => r.interviews).map((i) => i.nameState)).toContain(
      "PENDING",
    );

    // the seeker sees the request (no company name / place)
    const requests = await listInterviewConsentRequests(s.userId);
    expect(requests.map((r) => r.interviewId)).toEqual(
      expect.arrayContaining([interview.id, second.id, otherIv.id]),
    );
    expect(JSON.stringify(requests)).not.toMatch(/회의실|테스트 기업/);

    expect(
      await agreeInterviewConsent({
        userId: s.userId,
        interviewId: interview.id,
        locale: "ko",
        ip: null,
      }),
    ).toEqual({ ok: true, changed: true });
    const consent = await db.consent.findFirstOrThrow({
      where: { userId: s.userId, interviewId: interview.id, type: "THIRD_PARTY_INTERVIEW" },
    });
    expect(consent.version).toBe("v1");
    expect(consent.revokedAt).toBeNull();

    // after consent: the name only inside this interview of this company
    const after = await loadEmployerRequests(actor);
    expect(names(after)).toEqual(
      expect.arrayContaining([
        { id: interview.id, name: LEAK_NAME },
        { id: second.id, name: null },
      ]),
    );
    const afterApi = await apiText(actor);
    expect(afterApi.split(LEAK_NAME).length - 1).toBe(1);
    noContacts(afterApi, phone);

    // another company never sees it, even with a consent for its own (different) interview pending
    expect(await apiText(otherActor)).not.toContain(LEAK_NAME);
    expect(
      await loadInterviewDisclosure({
        companyId: other.employer.companyId,
        interviewId: interview.id,
        actorId: other.employer.id,
      }),
    ).toBeNull();

    // PII_VIEW per disclosure (field name only)
    const views = await auditRows(interview.id, "PII_VIEW");
    expect(views.length).toBeGreaterThan(0);
    expect(views[0].actorId).toBe(setup.employer.id);
    expect(JSON.stringify(views[0].meta)).not.toContain(LEAK_NAME);
  });

  it("R-211 / WO §11: revoking hides the name at once (CONSENT_REVOKE); decline gives nothing", async () => {
    const setup = await matchSetup("C2");
    const s = await matchSeeker(setup);
    const { interview } = await recommendedInterview(setup, s.id, "CONFIRMED");
    const actor = { id: setup.employer.id, companyId: setup.employer.companyId };
    await agreeInterviewConsent({
      userId: s.userId,
      interviewId: interview.id,
      locale: "en",
      ip: null,
    });
    expect(await apiText(actor)).toContain(LEAK_NAME);

    expect(await revokeInterviewConsent({ userId: s.userId, interviewId: interview.id })).toEqual({
      ok: true,
      changed: true,
    });
    expect(await apiText(actor)).not.toContain(LEAK_NAME);
    const revoked = await db.consent.findFirstOrThrow({
      where: { userId: s.userId, interviewId: interview.id },
    });
    expect(revoked.revokedAt).not.toBeNull();
    const audit = await auditRows(revoked.id, "CONSENT_REVOKE");
    expect(audit).toHaveLength(1);
    expect(audit[0].meta).toMatchObject({
      type: "THIRD_PARTY_INTERVIEW",
      interviewId: interview.id,
      reason: "REVOKE",
    });

    // agree again, then decline: revoked again and marked declined
    await agreeInterviewConsent({
      userId: s.userId,
      interviewId: interview.id,
      locale: "en",
      ip: null,
    });
    expect(await apiText(actor)).toContain(LEAK_NAME);
    await declineInterviewConsent({ userId: s.userId, interviewId: interview.id });
    expect(await apiText(actor)).not.toContain(LEAK_NAME);
    const data = await loadEmployerRequests(actor);
    expect(data.recommendations[0].interviews[0].nameState).toBe("NOT_GIVEN");
    expect((await listInterviewConsentRequests(s.userId))[0]?.state).toBe("DECLINED");
  });

  it("R-211: no consent before 면접 확정, nothing after cancellation, no answering someone else's interview", async () => {
    const setup = await matchSetup("C3");
    const s = await matchSeeker(setup);
    const intruder = await matchSeeker(setup);
    const actor = { id: setup.employer.id, companyId: setup.employer.companyId };
    const { interview: scheduled } = await recommendedInterview(setup, s.id, "SCHEDULED");
    expect(
      await agreeInterviewConsent({
        userId: s.userId,
        interviewId: scheduled.id,
        locale: "ko",
        ip: null,
      }),
    ).toEqual({ ok: false, code: "INTERVIEW_STATE" });

    const { interview } = await recommendedInterview(setup, s.id, "CONFIRMED");
    expect(
      await agreeInterviewConsent({
        userId: intruder.userId,
        interviewId: interview.id,
        locale: "ko",
        ip: null,
      }),
    ).toEqual({ ok: false, code: "NOT_FOUND" });
    await agreeInterviewConsent({
      userId: s.userId,
      interviewId: interview.id,
      locale: "ko",
      ip: null,
    });
    expect(await apiText(actor)).toContain(LEAK_NAME);

    await db.interview.update({
      where: { id: interview.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    expect(await apiText(actor)).not.toContain(LEAK_NAME);

    // Q-25: a confirmed then cancelled interview says the name display has ended
    const cancelled = await loadEmployerRequests(actor);
    expect(
      cancelled.recommendations
        .flatMap((r) => r.interviews)
        .find((i) => i.interviewId === interview.id)?.nameState,
    ).toBe("ENDED");
    // cancelled before 면접 확정: never asked
    await db.interview.update({
      where: { id: scheduled.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    expect(
      (await loadEmployerRequests(actor)).recommendations
        .flatMap((r) => r.interviews)
        .find((i) => i.interviewId === scheduled.id)?.nameState,
    ).toBe("NOT_ASKED");

    // a company with no recommendations sees empty lists
    const empty = await company({ verified: true, contracted: true });
    expect(JSON.parse(await apiText(empty))).toEqual({ interestRequests: [], recommendations: [] });
    session.actor = null;
    expect((await route.GET()).status).toBe(401);
  });

  it("R-211 / Q-25: the name is shown until the interview result is recorded, then it ends", async () => {
    const setup = await matchSetup("C4");
    const s = await matchSeeker(setup);
    const { interview } = await recommendedInterview(setup, s.id, "CONFIRMED");
    const actor = { id: setup.employer.id, companyId: setup.employer.companyId };
    const disclosure = () =>
      loadInterviewDisclosure({
        companyId: actor.companyId,
        interviewId: interview.id,
        actorId: actor.id,
      });
    const stateOf = async () =>
      (await loadEmployerRequests(actor)).recommendations
        .flatMap((r) => r.interviews)
        .find((i) => i.interviewId === interview.id)?.nameState;
    await agreeInterviewConsent({
      userId: s.userId,
      interviewId: interview.id,
      locale: "ko",
      ip: null,
    });

    // before the result: shown (attended only, or "결과 대기", does not end the 면접 건)
    expect(await disclosure()).toEqual({ legalName: LEAK_NAME });
    expect(await apiText(actor)).toContain(LEAK_NAME);
    expect(await stateOf()).toBe("GIVEN");
    await recordInterviewResult({ interviewId: interview.id, attended: true, result: "PENDING" });
    expect(await disclosure()).toEqual({ legalName: LEAK_NAME });
    expect(await stateOf()).toBe("GIVEN");

    // after a final result: gone from the serializer, the screen data and the API
    for (const result of ["REJECTED", "HIRED", "NO_SHOW"] as const) {
      await recordInterviewResult({ interviewId: interview.id, attended: true, result });
      expect(await disclosure()).toBeNull();
      const data = await loadEmployerRequests(actor);
      expect(JSON.stringify(data)).not.toContain(LEAK_NAME);
      expect(await apiText(actor)).not.toContain(LEAK_NAME);
      expect(await stateOf()).toBe("ENDED");
    }
    // the consent row itself stays (not deleted), only the display ended
    const consent = await db.consent.findFirstOrThrow({
      where: { userId: s.userId, interviewId: interview.id, type: "THIRD_PARTY_INTERVIEW" },
    });
    expect(consent.revokedAt).toBeNull();
    // no PII_VIEW written after the end
    const views = (await auditRows(interview.id, "PII_VIEW")).length;
    await loadEmployerRequests(actor);
    expect((await auditRows(interview.id, "PII_VIEW")).length).toBe(views);
  });

  it("Q-25: interviewEnded — cancelled or a final result ends it, PENDING or nothing does not", () => {
    expect(interviewEnded({ status: "CONFIRMED", result: null })).toBe(false);
    expect(interviewEnded({ status: "CONFIRMED", result: "PENDING" })).toBe(false);
    expect(interviewEnded({ status: "CANCELLED", result: null })).toBe(true);
    for (const r of DISCLOSURE_ENDING_RESULTS) {
      expect(interviewEnded({ status: "CONFIRMED", result: r })).toBe(true);
    }
    // every recorded result except PENDING ends the interview
    expect([...DISCLOSURE_ENDING_RESULTS].sort()).toEqual(
      INTERVIEW_RESULTS.filter((r) => r !== "PENDING").sort(),
    );
  });
});
