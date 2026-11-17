/**
 * R-215: 규칙 DB·점수표 server actions — "STAFF_VISA 이상". Drafts need `rules:edit`, 게시·폐기 need
 * `rules:publish` (STAFF_VISA·ADMIN); STAFF_PLACEMENT is refused with FORBIDDEN and nothing changes.
 * The staff session (requireStaff) is mocked; the permission check is the real rbac.
 * Dummy values only (BR-12).
 */
import type { Role } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { AuthzError } from "@/lib/rbac";

import { TEST_TAG_NOTE, uniq } from "../../../db/helpers";
import { auditRows, staffUser } from "../../../lib/admin/adminFixtures";

const session = vi.hoisted(() => ({ actor: null as { id: string; role: Role } | null }));

vi.mock("@/lib/admin/session", () => ({
  requireStaff: vi.fn(async () => {
    if (!session.actor) throw new AuthzError("UNAUTHENTICATED", 401, "no session");
    return { ...session.actor, displayName: null, totpEnrolled: true };
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { to });
  }),
}));

const rules = await import("@/server/actions/admin/rules");

afterAll(() => db.$disconnect());
beforeEach(() => {
  session.actor = null;
});

function fd(values: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) f.set(k, v);
  return f;
}

async function as(role: Role) {
  const u = await staffUser(role);
  session.actor = { id: u.id, role };
  return u;
}

/** Runs an action that redirects on success; returns the redirect target (or the state). */
async function redirectTarget(run: () => Promise<unknown>): Promise<string | unknown> {
  try {
    return await run();
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT")
      return (e as Error & { to: string }).to;
    throw e;
  }
}

const FORBIDDEN = { ok: false, code: "FORBIDDEN" };

describe("R-215 admin rule actions", () => {
  it("STAFF_PLACEMENT cannot create, publish or retire; STAFF_VISA can, and is recorded as reviewer", async () => {
    const visa = uniq("TESTVISA")
      .replace(/[^A-Za-z0-9_-]/g, "-")
      .slice(0, 40);
    await db.visaType.create({
      data: {
        code: visa,
        nameKey: "visaType.other.name",
        registrable: false,
        isStatusCode: false,
        active: false,
        note: TEST_TAG_NOTE,
      },
    });
    const ruleForm = () =>
      fd({
        visaCode: visa,
        industryCode: "",
        outcome: "GREEN",
        messageKey: "visa.result.needsReview",
        conditions: "{}",
      });

    expect(await rules.createVisaRuleAction(null, ruleForm())).toEqual({
      ok: false,
      code: "UNAUTHENTICATED",
    });
    await as("STAFF_PLACEMENT");
    expect(await rules.createVisaRuleAction(null, ruleForm())).toEqual(FORBIDDEN);
    expect(await db.visaRule.count({ where: { visaCode: visa } })).toBe(0);

    const visaStaff = await as("STAFF_VISA");
    const target = await redirectTarget(() => rules.createVisaRuleAction(null, ruleForm()));
    expect(target).toMatch(/^\/admin\/rules\/c[0-9a-z]+$/);
    const id = String(target).split("/").pop() as string;

    // publish: refused for STAFF_PLACEMENT, done by STAFF_VISA
    await as("STAFF_PLACEMENT");
    expect(await rules.publishVisaRuleAction(null, fd({ id }))).toEqual(FORBIDDEN);
    expect((await db.visaRule.findUniqueOrThrow({ where: { id } })).status).toBe("DRAFT");
    session.actor = { id: visaStaff.id, role: "STAFF_VISA" };
    expect(await rules.publishVisaRuleAction(null, fd({ id }))).toMatchObject({ ok: true });
    expect(await db.visaRule.findUniqueOrThrow({ where: { id } })).toMatchObject({
      status: "PUBLISHED",
      reviewedBy: visaStaff.id,
    });
    expect(await auditRows(id, "RULE_PUBLISH")).toHaveLength(1);

    // retire: refused for STAFF_PLACEMENT, done by ADMIN
    await as("STAFF_PLACEMENT");
    expect(await rules.retireVisaRuleAction(null, fd({ id }))).toEqual(FORBIDDEN);
    await as("ADMIN");
    expect(await rules.retireVisaRuleAction(null, fd({ id }))).toMatchObject({ ok: true });
    expect((await db.visaRule.findUniqueOrThrow({ where: { id } })).status).toBe("RETIRED");

    // bad JSON keeps the state answer (no redirect, no row)
    await as("STAFF_VISA");
    expect(
      await rules.createVisaRuleAction(
        null,
        fd({
          visaCode: visa,
          industryCode: "",
          outcome: "RED",
          messageKey: "visa.result.needsReview",
          conditions: "{oops",
        }),
      ),
    ).toEqual({ ok: false, code: "INVALID_JSON" });
  });

  it("score tables: STAFF_PLACEMENT refused; STAFF_VISA creates, edits and publishes a test table", async () => {
    const name = `TEST-${Date.now().toString(36)}`.slice(0, 20);
    const items = JSON.stringify({
      items: [{ key: "k", label: "TEST", bands: [{ key: "b", label: "TEST", points: 0 }] }],
    });
    await as("STAFF_PLACEMENT");
    expect(await rules.createScoreTableAction(null, fd({ name, passScore: "", items }))).toEqual(
      FORBIDDEN,
    );

    const staff = await as("STAFF_VISA");
    const target = await redirectTarget(() =>
      rules.createScoreTableAction(null, fd({ name, passScore: "", items })),
    );
    const id = String(target).split("/").pop() as string;
    expect(
      await rules.updateScoreTableAction(null, fd({ id, name: "IGNORED", passScore: "1", items })),
    ).toMatchObject({ ok: true });
    expect(await db.scoreTable.findUniqueOrThrow({ where: { id } })).toMatchObject({
      name,
      passScore: 1,
    });
    expect(await rules.publishScoreTableAction(null, fd({ id }))).toMatchObject({ ok: true });
    expect(await db.scoreTable.findUniqueOrThrow({ where: { id } })).toMatchObject({
      status: "PUBLISHED",
      reviewedBy: staff.id,
    });
  });
});
