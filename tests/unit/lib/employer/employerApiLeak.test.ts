/**
 * R-206 / WO15-02: no phone number or e-mail address in ANY response an employer can get.
 *
 * 1. Registry completeness (PLAN P2b 위험): every Route Handler under `src/app/api/employer/**` and
 *    every server action file under `src/server/actions/employer/**` (with its exported functions)
 *    must be listed in src/lib/employer/apiRegistry.ts — an unlisted endpoint fails this test.
 * 2. Every registered entry is called (success and refusal paths, flag on and off) with seekers
 *    whose name, e-mail, messenger, phone, free-text major and former employer are filled, and every
 *    response body is scanned with pii-guard: zero PHONE_* / EMAIL matches, none of the fixture's
 *    personal values. The calls are counted per entry, so a registered entry that is never called
 *    fails too.
 * The employer session is mocked (`requireEmployer` / `currentEmployer`); the rest is real.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EmployerActor } from "@/lib/employer/session";
import { EMPLOYER_ROUTE_HANDLERS, EMPLOYER_SERVER_ACTIONS } from "@/lib/employer/apiRegistry";
import { detectContacts } from "@/lib/pii-guard";
import { AuthzError } from "@/lib/rbac";
import { toBlindPublicId } from "@/lib/serializers/blindSeeker";
import { db } from "@/lib/db";

import {
  LEAK_EMAIL,
  LEAK_EMPLOYER,
  LEAK_MAJOR,
  LEAK_MESSENGER,
  LEAK_NAME,
  candidate,
  company,
  tag,
} from "../candidates/candidateFixtures";
import { seededRefs } from "./employerFixtures";

const session = vi.hoisted(() => ({ actor: null as EmployerActor | null }));

vi.mock("@/lib/employer/session", () => ({
  requireEmployer: vi.fn(async () => {
    if (!session.actor) throw new AuthzError("UNAUTHENTICATED", 401, "no session");
    return session.actor;
  }),
  currentEmployer: vi.fn(async () => session.actor),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/auth", () => ({ signIn: vi.fn(), auth: vi.fn(async () => null) }));
vi.mock("next-auth", () => ({ AuthError: class AuthError extends Error {} }));

const route = await import("@/app/api/employer/candidates/route");
const actions: Record<string, Record<string, unknown>> = {
  "src/server/actions/employer/account.ts": await import("@/server/actions/employer/account"),
  "src/server/actions/employer/diagnosis.ts": await import("@/server/actions/employer/diagnosis"),
  "src/server/actions/employer/request.ts": await import("@/server/actions/employer/request"),
  "src/server/actions/employer/candidates.ts": await import("@/server/actions/employer/candidates"),
  "src/server/actions/employer/contract.ts": await import("@/server/actions/employer/contract"),
};

afterAll(() => db.$disconnect());
beforeEach(() => {
  session.actor = null;
  process.env.FEATURE_EMPLOYER_CANDIDATES = "true";
});
afterEach(() => {
  delete process.env.FEATURE_EMPLOYER_CANDIDATES;
});

const ROOT = process.cwd();

function walk(dir: string): string[] {
  let out: string[] = [];
  let names: string[] = [];
  try {
    names = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of names) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out = out.concat(walk(full));
    else out.push(path.relative(ROOT, full).split(path.sep).join("/"));
  }
  return out;
}

/** Contact types WO §15-2 asks about: phone numbers and e-mail addresses. */
const CONTACT_TYPES = new Set(["PHONE_LOCAL", "PHONE_INTL", "EMAIL"]);
const PERSONAL = [LEAK_NAME, LEAK_EMAIL, LEAK_MESSENGER, LEAK_MAJOR, LEAK_EMPLOYER];

const called = new Map<string, number>();
const scanned: string[] = [];

/** Records one call of `entry` and returns its body as text for scanning. */
async function body(entry: string, response: unknown): Promise<string> {
  called.set(entry, (called.get(entry) ?? 0) + 1);
  const text =
    response instanceof Response ? await response.clone().text() : JSON.stringify(response ?? null);
  scanned.push(text);
  return text;
}

function assertClean(text: string, phones: string[] = []) {
  const found = detectContacts(text).filter((m) => CONTACT_TYPES.has(m.type));
  expect(found, text).toEqual([]);
  for (const secret of [...PERSONAL, ...phones]) expect(text).not.toContain(secret);
}

function getCandidates(query = "") {
  return route.GET(new NextRequest(`http://127.0.0.1/api/employer/candidates${query}`));
}

function fd(values: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) f.set(k, v);
  return f;
}

describe("R-206 employer API contact leak harness", () => {
  it("R-206: every employer Route Handler and server action is in the registry", () => {
    const routes = walk(path.join(ROOT, "src/app/api/employer")).filter((f) =>
      /\/route\.tsx?$/.test(f),
    );
    expect(routes.sort()).toEqual(EMPLOYER_ROUTE_HANDLERS.map((r) => r.file).sort());

    const actionFiles = walk(path.join(ROOT, "src/server/actions/employer")).filter((f) =>
      /\.tsx?$/.test(f),
    );
    expect(actionFiles.sort()).toEqual(EMPLOYER_SERVER_ACTIONS.map((a) => a.file).sort());
    for (const entry of EMPLOYER_SERVER_ACTIONS) {
      const source = readFileSync(path.join(ROOT, entry.file), "utf8");
      const exported = [
        ...source.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+([A-Za-z0-9_]+)/g),
      ].map((m) => m[1]);
      expect(exported.sort(), entry.file).toEqual([...entry.exports].sort());
      for (const name of entry.exports) {
        expect(typeof actions[entry.file]?.[name], `${entry.file} ${name}`).toBe("function");
      }
    }
  });

  it("WO15-02 / R-206: no phone or e-mail in any employer response (all entries, all paths)", async () => {
    const t = tag("leak");
    const seekers = [
      await candidate(t, { grade: "S", verifiedKorean: true, groupApply: true }),
      await candidate(t),
      await candidate(t, { visaCode: "E-9", track: "FUTURE_POOL" }),
    ];
    const phones = (
      await db.user.findMany({
        where: { id: { in: seekers.map((s) => s.userId) } },
        select: { phoneEnc: true },
      })
    ).map((u) => u.phoneEnc ?? "");
    const listCompany = await company({ verified: true, contracted: true });
    const statsCompany = await company();
    const refs = await seededRefs();

    // ── GET /api/employer/candidates ──
    const candidatesEntry = "src/app/api/employer/candidates/route.ts";
    session.actor = listCompany;
    const filtered = await getCandidates(`?convertible=${t}`);
    expect(filtered.status).toBe(200);
    const filteredText = await body(candidatesEntry, filtered);
    expect(filteredText).toContain(toBlindPublicId(seekers[0].publicId));
    expect(filteredText).not.toContain(toBlindPublicId(seekers[2].publicId)); // E-9
    // the whole list (SAMPLE seekers and every row other tests wrote)
    const all = await getCandidates();
    expect(all.status).toBe(200);
    await body(candidatesEntry, all);
    for (const q of ["?visa=F-4&stay=M12_PLUS&topik=1", "?skill=WELDING&dormitory=YES&shift=YES"]) {
      await body(candidatesEntry, await getCandidates(q));
    }
    session.actor = statsCompany;
    const stats = await getCandidates();
    expect(stats.status).toBe(200);
    expect(await body(candidatesEntry, stats)).toContain('"access":"STATS"');
    session.actor = null;
    expect((await getCandidates()).status).toBe(401);
    await body(candidatesEntry, await getCandidates());
    delete process.env.FEATURE_EMPLOYER_CANDIDATES;
    session.actor = listCompany;
    const off = await getCandidates();
    expect(off.status).toBe(404);
    await body(candidatesEntry, off);
    process.env.FEATURE_EMPLOYER_CANDIDATES = "true";

    // ── 면접 요청 ──
    const candidatesFile = "src/server/actions/employer/candidates.ts";
    const { requestCandidateInterviewAction } = actions[candidatesFile] as {
      requestCandidateInterviewAction: (p: null, f: FormData) => Promise<unknown>;
    };
    const iv = (publicId: string) =>
      requestCandidateInterviewAction(null, fd({ publicId, locale: "ko" }));
    session.actor = listCompany;
    const ok = await iv(toBlindPublicId(seekers[0].publicId));
    expect(ok).toEqual({ ok: true, already: false });
    await body(`${candidatesFile}#requestCandidateInterviewAction`, ok);
    await body(
      `${candidatesFile}#requestCandidateInterviewAction`,
      await iv(toBlindPublicId(seekers[0].publicId)),
    );
    await body(
      `${candidatesFile}#requestCandidateInterviewAction`,
      await iv(toBlindPublicId(seekers[2].publicId)),
    );
    await body(`${candidatesFile}#requestCandidateInterviewAction`, await iv("x"));
    session.actor = statsCompany;
    await body(
      `${candidatesFile}#requestCandidateInterviewAction`,
      await iv(toBlindPublicId(seekers[1].publicId)),
    );

    // ── 계약 동의 ──
    const contractFile = "src/server/actions/employer/contract.ts";
    const { signContractAction } = actions[contractFile] as {
      signContractAction: (i: unknown) => Promise<unknown>;
    };
    for (const input of [
      { termsAgreed: false, visaMandate: false, locale: "ko" },
      { termsAgreed: true, visaMandate: false, locale: "en" },
      { termsAgreed: true, visaMandate: true, locale: "en" },
    ]) {
      await body(`${contractFile}#signContractAction`, await signContractAction(input));
    }
    session.actor = null;
    await body(`${contractFile}#signContractAction`, await signContractAction({}));

    // ── 무료 채용 진단 / 구인 의뢰 / 가입·로그인 (P1d, P1b) ──
    const diagnosisFile = "src/server/actions/employer/diagnosis.ts";
    const { submitDiagnosis } = actions[diagnosisFile] as {
      submitDiagnosis: (i: unknown) => Promise<unknown>;
    };
    const answers = {
      industryCode: refs.industryCode,
      sido: refs.sido,
      sigungu: refs.sigungu,
      regularEmployees: "5",
      insuredDomestic: "5",
      foreignWorkers: [],
    };
    session.actor = listCompany;
    await body(`${diagnosisFile}#submitDiagnosis`, await submitDiagnosis(answers));
    await body(`${diagnosisFile}#submitDiagnosis`, await submitDiagnosis({}));

    const requestFile = "src/server/actions/employer/request.ts";
    const { submitJobRequestAction } = actions[requestFile] as {
      submitJobRequestAction: (i: unknown) => Promise<unknown>;
    };
    const request = {
      companyName: "누출 시험 제조",
      sido: refs.sido,
      sigungu: refs.sigungu,
      employeeCount: "20",
      contactName: "박담당",
      contactPhone: "010-5678-1234",
      contactEmail: "contact.person@example.test",
      role: "조립",
      payMin: "2600000",
      payMax: "",
      workHours: "08:00~17:00",
      overtime: "NONE",
      headcount: "4",
      startTiming: "IMMEDIATE",
      dormitory: "ALLOWANCE",
      meals: "PROVIDED",
      preferences: "",
      detail: "",
    };
    // the company's own contact person is never echoed back either
    const requestOk = await submitJobRequestAction(request);
    expect(requestOk).toEqual({ ok: true });
    const requestText = await body(`${requestFile}#submitJobRequestAction`, requestOk);
    expect(requestText).not.toContain("5678-1234");
    await body(
      `${requestFile}#submitJobRequestAction`,
      await submitJobRequestAction({ ...request, detail: "전화 010-2222-3333" }),
    );

    const accountFile = "src/server/actions/employer/account.ts";
    const { signUpEmployer, signInEmployer } = actions[accountFile] as {
      signUpEmployer: (i: unknown) => Promise<unknown>;
      signInEmployer: (i: unknown) => Promise<unknown>;
    };
    session.actor = null;
    await body(`${accountFile}#signUpEmployer`, await signUpEmployer({ locale: "ko" }));
    await body(
      `${accountFile}#signInEmployer`,
      await signInEmployer({ email: "not an email", password: "", locale: "ko" }),
    );

    // every registered entry was called
    const expected = [
      ...EMPLOYER_ROUTE_HANDLERS.map((r) => r.file),
      ...EMPLOYER_SERVER_ACTIONS.flatMap((a) => a.exports.map((e) => `${a.file}#${e}`)),
    ];
    for (const entry of expected) expect(called.get(entry) ?? 0, entry).toBeGreaterThan(0);

    // the scan itself (R-206)
    expect(scanned.length).toBeGreaterThan(15);
    for (const text of scanned) assertClean(text, phones);
  });
});
