/**
 * R-121 / DECISIONS Q-16: a grade move the transition table refuses is answered by the lead actions
 * as `{ ok: false, code: "INVALID_TRANSITION" }` (not an unhandled server error), and the call log
 * and audit rows roll back with the transaction. The staff session is mocked; `transitionLead` is
 * replaced by one that refuses every move so the refusal path can be reached at all (since Q-16 every
 * real call outcome is allowed by the table).
 */
import type { Role } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";

import { uniq } from "../../../db/helpers";
import { auditRows, lead, staffUser } from "../../../lib/admin/adminFixtures";

const session = vi.hoisted(() => ({ actor: null as { id: string; role: Role } | null }));

vi.mock("@/lib/admin/session", () => ({
  requireStaff: vi.fn(async () => {
    if (!session.actor) throw new Error("no session in this test");
    return { ...session.actor, displayName: null, totpEnrolled: true };
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/leads/transitions", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/leads/transitions")>();
  return {
    ...real,
    transitionLead: vi.fn(async (_tx: unknown, args: { from: "C"; to: "B" }) => {
      throw new real.LeadTransitionError(args.from, args.to);
    }),
  };
});

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

describe("R-121 / Q-16 lead actions — refused grade move", () => {
  it("R-121 / Q-16: recordCallAction returns INVALID_TRANSITION, no CallLog, no audit, grade kept", async () => {
    const staff = await staffUser("STAFF_PLACEMENT");
    session.actor = { id: staff.id, role: "STAFF_PLACEMENT" };
    const l = await lead(uniq("trx"), { grade: "C" });
    expect(await leads.recordCallAction(null, fd({ leadId: l.id, outcome: "INTERESTED" }))).toEqual(
      { ok: false, code: "INVALID_TRANSITION" },
    );
    expect(await db.callLog.count({ where: { leadId: l.id } })).toBe(0);
    expect(await auditRows(l.id)).toHaveLength(0);
    const row = await db.jobLead.findUniqueOrThrow({ where: { id: l.id } });
    expect(row.grade).toBe("C");
    expect(row.lastContactedAt).toBeNull();
  });

  it("R-121 / Q-16: verifyLeadAction returns INVALID_TRANSITION and keeps the review task open", async () => {
    const staff = await staffUser("STAFF_PLACEMENT");
    session.actor = { id: staff.id, role: "STAFF_PLACEMENT" };
    const l = await lead(uniq("trx"), { grade: "B", requestedAt: new Date() });
    const task = await db.staffTask.create({
      data: { type: "LEAD_REVIEW", leadId: l.id, assigneeRole: "STAFF_PLACEMENT" },
    });
    expect(await leads.verifyLeadAction(null, fd({ leadId: l.id }))).toEqual({
      ok: false,
      code: "INVALID_TRANSITION",
    });
    expect((await db.jobLead.findUniqueOrThrow({ where: { id: l.id } })).grade).toBe("B");
    expect((await db.staffTask.findUniqueOrThrow({ where: { id: task.id } })).status).toBe("OPEN");
    expect(await auditRows(l.id)).toHaveLength(0);
  });
});
