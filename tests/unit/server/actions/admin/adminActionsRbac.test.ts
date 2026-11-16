/**
 * R-120 / R-121 / R-122 (PLAN P1e 작업 5, DECISIONS Q-08, WO §11): every admin server action checks
 * the staff session first and then its own permission. The staff session (requireStaff) is mocked;
 * the permission check is the real rbac.
 */
import type { Role } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthzError } from "@/lib/rbac";
import { db } from "@/lib/db";

import { uniq } from "../../../db/helpers";
import { auditRows, lead, seeker, staffUser } from "../../../lib/admin/adminFixtures";

const session = vi.hoisted(() => ({ actor: null as { id: string; role: Role } | null }));

vi.mock("@/lib/admin/session", () => ({
  requireStaff: vi.fn(async () => {
    if (!session.actor) throw new AuthzError("UNAUTHENTICATED", 401, "no session");
    return { ...session.actor, displayName: null, totpEnrolled: true };
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const seekers = await import("@/server/actions/admin/seekers");
const leads = await import("@/server/actions/admin/leads");

afterAll(() => db.$disconnect());
beforeEach(() => {
  session.actor = null;
});

function fd(values: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) f.set(k, v);
  return f;
}

const FORBIDDEN = { ok: false, code: "FORBIDDEN" };
const UNAUTHENTICATED = { ok: false, code: "UNAUTHENTICATED" };

async function as(role: Role) {
  const u = await staffUser(role);
  session.actor = { id: u.id, role };
  return u;
}

describe("admin server actions — permission matrix", () => {
  it("Q-08: grade / track / flags / conversion need seeker:review (STAFF_VISA·ADMIN only)", async () => {
    const s = await seeker(uniq("act"));
    const calls = [
      () => seekers.changeGradeAction(null, fd({ seekerId: s.id, to: "A" })),
      () => seekers.changeTrackAction(null, fd({ seekerId: s.id, to: "CONSULT_ONLY" })),
      () => seekers.updateReviewFlagsAction(null, fd({ seekerId: s.id, consulted: "true" })),
      () =>
        seekers.setConvertibilityAction(
          null,
          fd({ seekerId: s.id, convertibleVisa: "", convertibleAt: "" }),
        ),
    ];
    for (const call of calls) expect(await call()).toEqual(UNAUTHENTICATED);
    await as("STAFF_PLACEMENT");
    // QA O-3: a refused permission is a plain result, not an unhandled error; nothing changes.
    for (const call of calls) expect(await call()).toEqual(FORBIDDEN);
    expect((await db.seekerProfile.findUniqueOrThrow({ where: { id: s.id } })).grade).toBe("B");
    expect(await auditRows(s.id)).toHaveLength(0);

    await as("STAFF_VISA");
    expect(await seekers.changeGradeAction(null, fd({ seekerId: s.id, to: "A" }))).toMatchObject({
      ok: false,
      code: "REQUIREMENTS_UNMET",
    });
    expect(
      await seekers.updateReviewFlagsAction(
        null,
        fd({ seekerId: s.id, consulted: "true", verifiedVisa: "true" }),
      ),
    ).toMatchObject({ ok: true });
    expect(await seekers.changeGradeAction(null, fd({ seekerId: s.id, to: "A" }))).toMatchObject({
      ok: true,
    });
    expect(await auditRows(s.id, "SEEKER_GRADE_CHANGE")).toHaveLength(1);
  });

  it("WO §11: seeker contacts need contact:view (not STAFF_VISA); basic PII needs seeker:view", async () => {
    const s = await seeker(uniq("act"), { emailEnc: "x@example.test" });
    await as("STAFF_VISA");
    expect(await seekers.revealSeekerContactAction(null, fd({ seekerId: s.id }))).toEqual(
      FORBIDDEN,
    );
    expect(await auditRows(s.id, "PII_VIEW")).toHaveLength(0);
    expect(await seekers.revealSeekerBasicAction(null, fd({ seekerId: s.id }))).toMatchObject({
      ok: true,
    });
    await as("STAFF_PLACEMENT");
    expect(await seekers.revealSeekerContactAction(null, fd({ seekerId: s.id }))).toMatchObject({
      ok: true,
      values: { email: "x@example.test" },
    });
    expect(await auditRows(s.id, "PII_VIEW")).toHaveLength(2);
  });

  it("R-121: lead actions need lead:manage / contact:view (STAFF_PLACEMENT·ADMIN, not STAFF_VISA)", async () => {
    const l = await lead(uniq("act"));
    await as("STAFF_VISA");
    expect(await leads.recordCallAction(null, fd({ leadId: l.id, outcome: "INTERESTED" }))).toEqual(
      FORBIDDEN,
    );
    expect(await leads.verifyLeadAction(null, fd({ leadId: l.id }))).toEqual(FORBIDDEN);
    expect(await leads.revealLeadContactAction(null, fd({ leadId: l.id }))).toEqual(FORBIDDEN);
    expect(await db.callLog.count({ where: { leadId: l.id } })).toBe(0);
    expect(await auditRows(l.id)).toHaveLength(0);

    await as("STAFF_PLACEMENT");
    expect(
      await leads.recordCallAction(null, fd({ leadId: l.id, outcome: "INTERESTED", note: "" })),
    ).toMatchObject({ ok: true });
    expect((await db.jobLead.findUniqueOrThrow({ where: { id: l.id } })).grade).toBe("B");
    expect(await leads.recordCallAction(null, fd({ leadId: l.id, outcome: "BOGUS" }))).toEqual({
      ok: false,
      code: "INVALID_INPUT",
    });
    expect(await leads.revealLeadContactAction(null, fd({ leadId: l.id }))).toMatchObject({
      ok: true,
    });
    expect(await auditRows(l.id, "PII_VIEW")).toHaveLength(1);
  });

  it("Q-14: NO_INTENT / DNC (→ 재접촉금지, final) need the screen's confirmation (confirmFinal=yes)", async () => {
    await as("STAFF_PLACEMENT");
    for (const outcome of ["NO_INTENT", "DNC"]) {
      const l = await lead(uniq("act"));
      expect(await leads.recordCallAction(null, fd({ leadId: l.id, outcome, note: "" }))).toEqual({
        ok: false,
        code: "CONFIRM_REQUIRED",
      });
      expect(await db.callLog.count({ where: { leadId: l.id } })).toBe(0);
      expect((await db.jobLead.findUniqueOrThrow({ where: { id: l.id } })).grade).toBe("C");
      expect(
        await leads.recordCallAction(
          null,
          fd({ leadId: l.id, outcome, note: "", confirmFinal: "yes" }),
        ),
      ).toMatchObject({ ok: true });
      expect((await db.jobLead.findUniqueOrThrow({ where: { id: l.id } })).grade).toBe(
        "DO_NOT_CONTACT",
      );
      expect((await auditRows(l.id, "LEAD_GRADE_CHANGE"))[0].meta).toMatchObject({
        reason: outcome === "DNC" ? "CALL_DNC" : "CALL_NO_INTENT",
      });
    }
  });
});
