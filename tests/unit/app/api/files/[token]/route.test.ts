/**
 * R-210: GET /api/files/[token] — 소개 확인서 through a 5-minute signed URL.
 * Expired or tampered → 403, issued to another staff member → 403, no staff session → 401,
 * a valid link → the file (attachment, no-store) + PII_VIEW audit. The clock is faked (Date only).
 * The staff session check (`requireStaffApi`) is mocked; the permission it asks for is checked.
 */
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import type { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { SIGNED_URL_TTL_SEC } from "@/config/limits";
import { db } from "@/lib/db";
import { signFileToken } from "@/lib/files/signedUrl";
import { AuthzError, type Permission, assertCan } from "@/lib/rbac";
import { attachIntroConfirm } from "@/lib/recommendations/interviews";

import { auditRows } from "../../../../lib/admin/adminFixtures";
import {
  matchSeeker,
  matchSetup,
  recommendedInterview,
} from "../../../../lib/recommendations/matchingFixtures";

const session = vi.hoisted(() => ({
  actor: null as { id: string; role: Role } | null,
  asked: [] as string[],
}));

vi.mock("@/lib/admin/session", () => ({
  requireStaffApi: vi.fn(async (permission: Permission) => {
    session.asked.push(permission);
    if (!session.actor) throw new AuthzError("UNAUTHENTICATED", 401, "no session");
    assertCan(session.actor.role, permission);
    return { ...session.actor, displayName: null, totpEnrolled: true };
  }),
}));

const { GET } = await import("@/app/api/files/[token]/route");

const PDF = new Uint8Array([...Buffer.from("%PDF-1.7\n"), 7, 7, 7]);
let previous: string | undefined;

beforeAll(() => {
  previous = process.env.PRIVATE_STORAGE_DIR;
  process.env.PRIVATE_STORAGE_DIR = mkdtempSync(path.join(os.tmpdir(), "vj-files-"));
});
afterAll(async () => {
  if (previous === undefined) delete process.env.PRIVATE_STORAGE_DIR;
  else process.env.PRIVATE_STORAGE_DIR = previous;
  await db.$disconnect();
});
beforeEach(() => {
  session.actor = null;
  session.asked = [];
});
afterEach(() => {
  vi.useRealTimers();
});

function get(token: string) {
  return GET(new NextRequest(`http://127.0.0.1/api/files/${token}`), {
    params: Promise.resolve({ token }),
  });
}

async function uploaded() {
  const setup = await matchSetup("F");
  const s = await matchSeeker(setup);
  const { interview } = await recommendedInterview(setup, s.id);
  const r = await attachIntroConfirm({ interviewId: interview.id, bytes: PDF });
  expect(r).toEqual({ ok: true });
  const row = await db.interview.findUniqueOrThrow({ where: { id: interview.id } });
  return { setup, interview: row, key: row.introConfirmFile as string };
}

describe("R-210 GET /api/files/[token]", () => {
  it("R-210: a valid link serves the file once audited; after 5 minutes the same link is 403", async () => {
    const { setup, interview, key } = await uploaded();
    session.actor = { id: setup.staff.id, role: "STAFF_PLACEMENT" };
    const t0 = new Date();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(t0);
    const token = signFileToken({ key, userId: setup.staff.id, purpose: "INTRO_CONFIRM" }, t0);

    const ok = await get(token);
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toBe("application/pdf");
    expect(ok.headers.get("cache-control")).toBe("no-store");
    expect(ok.headers.get("content-disposition")).toMatch(/^attachment;/);
    expect(ok.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await ok.arrayBuffer())).toEqual(PDF);
    expect(session.asked).toContain("interview:manage");
    const audit = await auditRows(interview.id, "PII_VIEW");
    expect(audit.map((a) => a.meta)).toContainEqual({ fields: ["introConfirmFile"] });

    vi.setSystemTime(new Date(t0.getTime() + (SIGNED_URL_TTL_SEC - 1) * 1000));
    expect((await get(token)).status).toBe(200);
    vi.setSystemTime(new Date(t0.getTime() + SIGNED_URL_TTL_SEC * 1000));
    const expired = await get(token);
    expect(expired.status).toBe(403);
    expect(await expired.json()).toEqual({
      error: { code: "FORBIDDEN", message: "the link is expired or invalid" },
    });
  });

  it("R-210: a tampered link, another staff member's link and a missing session are refused", async () => {
    const { setup, key } = await uploaded();
    const token = signFileToken({ key, userId: setup.staff.id, purpose: "INTRO_CONFIRM" });
    const [body, sig] = token.split(".");
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as object;
    const longer = Buffer.from(JSON.stringify({ ...payload, e: 4_102_444_800 })).toString(
      "base64url",
    );

    session.actor = { id: setup.staff.id, role: "STAFF_PLACEMENT" };
    expect((await get(`${longer}.${sig}`)).status).toBe(403);
    expect((await get(`${body}.${sig.slice(1)}A`)).status).toBe(403);
    expect((await get("not-a-token")).status).toBe(403);

    session.actor = { id: "another-staff", role: "ADMIN" };
    expect((await get(token)).status).toBe(403);

    session.actor = { id: setup.staff.id, role: "STAFF_VISA" }; // no interview:manage
    expect((await get(token)).status).toBe(403);

    session.actor = null;
    expect((await get(token)).status).toBe(401);
  });

  it("R-210: a link to a file that is no longer the interview's 소개 확인서 is 404", async () => {
    const { setup, interview, key } = await uploaded();
    await attachIntroConfirm({ interviewId: interview.id, bytes: PDF }); // replaced
    session.actor = { id: setup.staff.id, role: "ADMIN" };
    const token = signFileToken({ key, userId: setup.staff.id, purpose: "INTRO_CONFIRM" });
    expect((await get(token)).status).toBe(404);
  });
});
