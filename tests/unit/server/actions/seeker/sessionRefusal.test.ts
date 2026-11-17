/**
 * R-211 / R-113 (P2c QA O-5): seeker self-service server actions called without a seeker session
 * return a plain refusal `{ ok: false, code: "UNAUTHENTICATED" | "FORBIDDEN" }` — not an unhandled
 * server error (500) — and change nothing (STANDARD 4.5 v2.13 try/catch form).
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";

const session = vi.hoisted(() => ({
  value: null as null | { user: { id: string; role: string } },
}));
vi.mock("@/auth", () => ({ signIn: vi.fn(), auth: vi.fn(async () => session.value) }));
// register.ts imports AuthError from next-auth (its ESM build does not load under Vitest).
vi.mock("next-auth", () => ({ AuthError: class AuthError extends Error {} }));

const me = await import("@/server/actions/seeker/me");
const register = await import("@/server/actions/seeker/register");

afterAll(() => db.$disconnect());
beforeEach(() => {
  session.value = null;
});

async function callAll() {
  return [
    await me.answerInterviewConsent({ interviewId: "x", action: "agree", locale: "ko" }),
    await me.changeConsent({ type: "MARKETING", action: "revoke", locale: "ko" }),
    await me.saveStaySettings({ stayExpiry: "2027-01", stayAlertOptIn: true }),
    await register.saveRegistrationStep({ step: "1", locale: "ko", values: {} }),
  ];
}

describe("R-211 / R-113 seeker actions without a seeker session (P2c QA O-5)", () => {
  it("R-211: no session → UNAUTHENTICATED for every seeker self-service action", async () => {
    for (const r of await callAll()) {
      expect(r).toMatchObject({ ok: false, code: "UNAUTHENTICATED" });
    }
  });

  it("R-211: another role's session → FORBIDDEN", async () => {
    session.value = { user: { id: "employer-user", role: "EMPLOYER" } };
    for (const r of await callAll()) expect(r).toMatchObject({ ok: false, code: "FORBIDDEN" });
  });

  it("R-211: a seeker session whose account is gone → UNAUTHENTICATED", async () => {
    session.value = { user: { id: "no-such-user-o5", role: "SEEKER" } };
    for (const r of await callAll()) {
      expect(r).toMatchObject({ ok: false, code: "UNAUTHENTICATED" });
    }
  });
});
