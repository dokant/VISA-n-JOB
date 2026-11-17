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
 * 3. P2c (R-211 v1.1, PC-1): the ONE exception is the real name of a seeker who consented for a
 *    confirmed interview of the asking company, at the registered JSON path
 *    (`EMPLOYER_NAME_DISCLOSURE`). The harness takes those values out before the personal-value scan
 *    and checks each one: it must be the consented seeker's name for an interview id the test
 *    consented to; everywhere else the path must hold null. Phone / e-mail patterns are scanned in
 *    the full body (name included) with no exception.
 * The employer session is mocked (`requireEmployer` / `currentEmployer`); the rest is real.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EmployerActor } from "@/lib/employer/session";
import { agreeInterviewConsent } from "@/lib/consent/thirdParty";
import {
  EMPLOYER_NAME_DISCLOSURE,
  EMPLOYER_ROUTE_HANDLERS,
  EMPLOYER_SERVER_ACTIONS,
} from "@/lib/employer/apiRegistry";
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
import { matchSeeker, matchSetup, recommendedInterview } from "../recommendations/matchingFixtures";
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
const requestsRoute = await import("@/app/api/employer/requests/route");
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
/** Full bodies of the name-disclosure entries: scanned for phone / e-mail with no exception. */
const contactOnly: string[] = [];
/** Interview ids the test consented to (THIRD_PARTY_INTERVIEW) and the names found at the path. */
const consentedInterviews = new Set<string>();
const disclosed: { entry: string; interviewId: string | null; value: unknown }[] = [];

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

/**
 * Takes the values at `path` ("a[].b[].c.d") out of `node` (sets them to null) and reports each one
 * with the id of the nearest object that has `interviewId`.
 */
function takeOut(
  node: Json,
  parts: string[],
  found: { interviewId: string | null; value: unknown }[],
  interviewId: string | null = null,
): void {
  if (node === null || typeof node !== "object" || parts.length === 0) return;
  const [head, ...rest] = parts;
  const many = head.endsWith("[]");
  const key = many ? head.slice(0, -2) : head;
  if (Array.isArray(node)) return;
  const here = typeof node.interviewId === "string" ? node.interviewId : interviewId;
  const child = node[key];
  if (rest.length === 0 && !many) {
    if (key in node) {
      found.push({ interviewId: here, value: child });
      node[key] = null;
    }
    return;
  }
  for (const item of many && Array.isArray(child) ? child : [child]) {
    if (item !== null && typeof item === "object" && !Array.isArray(item)) {
      const id = typeof item.interviewId === "string" ? item.interviewId : here;
      takeOut(item, rest, found, id);
    }
  }
}

/** Records one call of `entry` and returns its body as text for scanning. */
async function body(entry: string, response: unknown): Promise<string> {
  called.set(entry, (called.get(entry) ?? 0) + 1);
  const text =
    response instanceof Response ? await response.clone().text() : JSON.stringify(response ?? null);
  const rule = EMPLOYER_NAME_DISCLOSURE.find((r) => r.entry === entry);
  if (!rule) {
    scanned.push(text);
    return text;
  }
  contactOnly.push(text);
  let parsed: Json;
  try {
    parsed = JSON.parse(text) as Json;
  } catch {
    scanned.push(text);
    return text;
  }
  const found: { interviewId: string | null; value: unknown }[] = [];
  takeOut(parsed, rule.path.split("."), found);
  for (const f of found) disclosed.push({ entry, ...f });
  scanned.push(JSON.stringify(parsed));
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
    // P2b QA O-5: the tag is not a VisaType code, so the API sends convertibleVisa null (as the card)
    expect(filteredText).not.toContain(t);
    const filteredBody = JSON.parse(filteredText) as {
      candidates: { publicId: string; convertibleVisa: string | null }[];
    };
    expect(filteredBody.candidates.length).toBeGreaterThan(0);
    for (const c of filteredBody.candidates) expect(c.convertibleVisa).toBeNull();
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

    // ── 면접 요청 현황 (R-212) + 건별 동의 실명 (R-211) ──
    const requestsEntry = "src/app/api/employer/requests/route.ts";
    const setup = await matchSetup("LK");
    const consented = await matchSeeker(setup);
    const notConsented = await matchSeeker(setup);
    for (const s of [consented, notConsented]) {
      phones.push((await db.user.findUniqueOrThrow({ where: { id: s.userId } })).phoneEnc ?? "");
    }
    const yes = await recommendedInterview(setup, consented.id, "CONFIRMED");
    await recommendedInterview(setup, notConsented.id, "CONFIRMED");
    await recommendedInterview(setup, consented.id, "SCHEDULED");
    await db.interestRequest.create({
      data: {
        initiator: "EMPLOYER",
        seekerId: notConsented.id,
        companyId: setup.employer.companyId,
      },
    });
    const requestsActor = { id: setup.employer.id, companyId: setup.employer.companyId };
    session.actor = requestsActor;
    const before = await requestsRoute.GET();
    expect(await body(requestsEntry, before)).not.toContain(LEAK_NAME);
    expect(
      await agreeInterviewConsent({
        userId: consented.userId,
        interviewId: yes.interview.id,
        locale: "ko",
        ip: null,
      }),
    ).toEqual({ ok: true, changed: true });
    consentedInterviews.add(yes.interview.id);
    const after = await requestsRoute.GET();
    expect(after.status).toBe(200);
    expect(await body(requestsEntry, after)).toContain(LEAK_NAME);
    // other companies (the list company, an unrelated one) get nothing
    session.actor = listCompany;
    await body(requestsEntry, await requestsRoute.GET());
    session.actor = statsCompany;
    await body(requestsEntry, await requestsRoute.GET());
    session.actor = null;
    expect((await requestsRoute.GET()).status).toBe(401);
    await body(requestsEntry, await requestsRoute.GET());

    // the disclosure exception: only the consented seeker's name, only for the consented interview
    const names = disclosed.filter((d) => d.value !== null);
    expect(names.length).toBeGreaterThan(0);
    for (const d of names) {
      expect(d.value, JSON.stringify(d)).toBe(LEAK_NAME);
      expect(consentedInterviews.has(d.interviewId ?? ""), JSON.stringify(d)).toBe(true);
      expect(EMPLOYER_NAME_DISCLOSURE.map((r) => r.entry)).toContain(d.entry);
    }
    // contacts: no exception, whole body
    for (const text of contactOnly) {
      expect(
        detectContacts(text).filter((m) => CONTACT_TYPES.has(m.type)),
        text,
      ).toEqual([]);
      for (const secret of [LEAK_EMAIL, LEAK_MESSENGER, LEAK_MAJOR, LEAK_EMPLOYER, ...phones]) {
        expect(text).not.toContain(secret);
      }
    }

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
