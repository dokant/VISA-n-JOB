/**
 * R-114 / R-115 / R-129: POST /api/ingest/job-leads.
 * PRD R-114 "같은 배치 2회 → 행 수 동일, closesAt 과거 거부, 201건 거부, 키 없음 401".
 */
import { randomBytes } from "node:crypto";

import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/ingest/job-leads/route";
import { INGEST_MAX_BATCH, RATE_LIMITS } from "@/config/limits";
import { consumeRateLimit, rateLimitSubject } from "@/lib/rateLimit";

import { testPrisma } from "../../../../db/helpers";
import { batch, leadItem } from "../../../../lib/leads/leadFixtures";

const prisma = testPrisma();
const KEY = randomBytes(32).toString("base64url");

beforeAll(() => {
  process.env.INGEST_API_KEY = KEY;
});
afterAll(async () => {
  delete process.env.INGEST_API_KEY;
  await prisma.$disconnect();
});

function post(body: unknown, key: string | null = KEY, headers: Record<string, string> = {}) {
  return POST(
    new NextRequest("http://127.0.0.1/api/ingest/job-leads", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(key === null ? {} : { "x-api-key": key }),
        ...headers,
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

type Body = {
  created: number;
  updated: number;
  rejected: Array<{ sourceRef: string | null; reason: string }>;
};

describe("R-114 POST /api/ingest/job-leads", () => {
  it("R-114: 401 without a key or with a wrong key, in the STANDARD 5 error format", async () => {
    const items = batch(1);
    const none = await post(items, null);
    expect(none.status).toBe(401);
    expect(await none.json()).toEqual({
      error: { code: "UNAUTHENTICATED", message: "missing or invalid API key" },
    });
    expect((await post(items, `${KEY}x`)).status).toBe(401);
    expect((await post(items, "")).status).toBe(401);
    expect(await prisma.jobLead.count({ where: { sourceRef: items[0].sourceRef as string } })).toBe(
      0,
    );
  });

  it("R-114: every request is refused while the server key is unset (fail closed)", async () => {
    delete process.env.INGEST_API_KEY;
    try {
      expect((await post(batch(1), KEY)).status).toBe(401);
    } finally {
      process.env.INGEST_API_KEY = KEY;
    }
  });

  it("R-114: the same batch twice keeps the row count (sourceRef upsert)", async () => {
    const items = batch(3);
    const refs = items.map((i) => i.sourceRef as string);
    const first = await post(items);
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ created: 3, updated: 0, rejected: [] });
    const count = await prisma.jobLead.count({ where: { sourceRef: { in: refs } } });
    expect(count).toBe(3);

    const second = await post(items);
    expect(await second.json()).toEqual({ created: 0, updated: 3, rejected: [] });
    expect(await prisma.jobLead.count({ where: { sourceRef: { in: refs } } })).toBe(count);
  });

  it("R-114: an item whose closesAt is past is rejected, the rest of the batch is stored", async () => {
    const now = Date.now();
    const closed = leadItem({ closesAt: new Date(now - 60_000).toISOString() });
    const open = leadItem();
    const res = await post([closed, open]);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Body;
    expect(body.created).toBe(1);
    expect(body.rejected).toEqual([{ sourceRef: closed.sourceRef, reason: "CLOSED" }]);
    expect(await prisma.jobLead.count({ where: { sourceRef: closed.sourceRef as string } })).toBe(
      0,
    );
  });

  it(`R-114: ${INGEST_MAX_BATCH + 1} items are refused as a whole (400), ${INGEST_MAX_BATCH} are accepted`, async () => {
    const tooMany = batch(INGEST_MAX_BATCH + 1);
    const res = await post(tooMany);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("BATCH_TOO_LARGE");
    expect(
      await prisma.jobLead.count({
        where: { sourceRef: { in: tooMany.map((i) => i.sourceRef as string) } },
      }),
    ).toBe(0);

    const max = await post(batch(INGEST_MAX_BATCH));
    expect(max.status).toBe(200);
    expect(((await max.json()) as Body).created).toBe(INGEST_MAX_BATCH);
  }, 120_000);

  it("400 for a body that is not a non-empty array", async () => {
    expect((await post({ sourceRef: "x" })).status).toBe(400);
    expect((await post([])).status).toBe(400);
    expect((await post("not json")).status).toBe(400);
  });

  it("invalid items, unknown regions, reserved refs and in-batch duplicates are reported", async () => {
    const dup = leadItem();
    const res = await post([
      { sourceRef: "no-title-x" },
      leadItem({ sido: "없는도", sigungu: undefined, sourceRef: "unknown-region-x" }),
      leadItem({ sourceRef: "DIAGNOSIS:hijack" }),
      leadItem({ payMin: 3_000_000, payMax: 1_000_000, sourceRef: "pay-x" }),
      dup,
      dup,
    ]);
    const body = (await res.json()) as Body;
    expect(body.created).toBe(1);
    expect(body.rejected).toEqual([
      { sourceRef: "no-title-x", reason: "INVALID" },
      { sourceRef: "unknown-region-x", reason: "UNKNOWN_REGION" },
      { sourceRef: "DIAGNOSIS:hijack", reason: "RESERVED_SOURCE_REF" },
      { sourceRef: "pay-x", reason: "INVALID" },
      { sourceRef: dup.sourceRef, reason: "DUPLICATE_IN_BATCH" },
    ]);
  });

  it("BR-14 (P2a QA D-3, O-1): maskContacts masks category separators, keycaps and other digits in place", async () => {
    const keycap = "0️⃣1️⃣0️⃣1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣8️⃣";
    const item = leadItem({
      title: `생산직 문의 010ㅡ1234ㅡ5678 • 숙소 제공 • 09:00~18:00`,
      companyName: `마스킹 제조 010→1234→5678`,
      memo: `앞 010•1234•5678 중간 ${keycap} 뒤 ٠١٠-١٢٣٤-٥٦٧٨ 끝 월 2,500,000원`,
    });
    const res = await post([item]);
    expect(res.status).toBe(200);
    expect(((await res.json()) as Body).created).toBe(1);
    const row = await prisma.jobLead.findUniqueOrThrow({
      where: { sourceRef: item.sourceRef as string },
    });
    expect(row.title).toBe("생산직 문의 *** • 숙소 제공 • 09:00~18:00");
    expect(row.companyName).toBe("마스킹 제조 ***");
    expect(JSON.stringify(row.rawJson)).toContain("앞 *** 중간 *** 뒤 *** 끝 월 2,500,000원");
    expect(JSON.stringify(row.rawJson)).not.toMatch(/1234|٢٣٤/);
  });

  it("BR-14 (P2a QA run 3 D-4, O-1): date ranges and amount ranges are kept, only the number is masked", async () => {
    const dates =
      "근무 2026.12.01~2027.01.31 / 2026.12.01 ~ 2027.01.31 / 2026-12-01~2027-01-31 / " +
      "2026. 12. 01 ~ 2027. 01. 31 / 2026/12/01→2027/01/31";
    const item = leadItem({
      title: "단기 2026.12.01~2027.01.31 일당 820000~950000원",
      memo: `${dates} 일당 820000 ~ 950000 문의 010 2026.12.01 끝`,
    });
    const res = await post([item]);
    expect(res.status).toBe(200);
    expect(((await res.json()) as Body).created).toBe(1);
    const row = await prisma.jobLead.findUniqueOrThrow({
      where: { sourceRef: item.sourceRef as string },
    });
    expect(row.title).toBe("단기 2026.12.01~2027.01.31 일당 820000~950000원");
    expect(JSON.stringify(row.rawJson)).toContain(`${dates} 일당 820000 ~ 950000 문의 *** 끝`);
  });

  it("BR-14 (P2a QA run 4 D-5): phone prefixes next to a date and numbers ending in a year are masked", async () => {
    const d5 = [
      "생산직 02 2026.12.01",
      "문의 02 2026-12-01",
      "문의 02 2026 12 01",
      "생산직 02-1201-2026.12",
      "문의 010-1234-2026.12",
      "문의 010-5678-2026.12.01",
      "문의 010 1234 2026.12",
    ];
    const item = leadItem({ title: d5[0], memo: d5.join(" / ") });
    const res = await post([item]);
    expect(res.status).toBe(200);
    expect(((await res.json()) as Body).created).toBe(1);
    const row = await prisma.jobLead.findUniqueOrThrow({
      where: { sourceRef: item.sourceRef as string },
    });
    expect(row.title).toBe("생산직 ***");
    expect(JSON.stringify(row.rawJson)).toContain(
      "생산직 *** / 문의 *** / 문의 *** / 생산직 ***.12 / 문의 ***.12 / 문의 ***.12.01 / 문의 ***.12",
    );
  });

  it("BR-14 (P2a QA run 5 D-6, O-2, O-3): glued prefixes before a date and numbers after an amount range are masked whole", async () => {
    const d6 = [
      "문의 0101234 2026.12.01",
      "문의 0101234-2026.12",
      "문의 0105678 2026.12.01",
      "문의 021201 2026.12",
    ];
    const item = leadItem({
      title: "일당 820000~950000 010-1234-5678",
      memo: `${d6.join(" / ")} / 문의 02 2026년 12월 01일 / 근무 17:00 (2026.12.01~2027.01.31) 끝`,
    });
    const res = await post([item]);
    expect(res.status).toBe(200);
    expect(((await res.json()) as Body).created).toBe(1);
    const row = await prisma.jobLead.findUniqueOrThrow({
      where: { sourceRef: item.sourceRef as string },
    });
    expect(row.title).toBe("일당 820000~950000 ***");
    const raw = JSON.stringify(row.rawJson);
    expect(raw).toContain(
      "문의 ***.12.01 / 문의 ***.12 / 문의 ***.12.01 / 문의 ***.12 / 문의 ***일 / ",
    );
    // run 7 (Q-21): a time next to a date period is checked strictly — accepted false positive
    expect(raw).toContain("근무 17:***.31) 끝");
    // no 4 or more phone digits left (the kept date period and the amount range aside)
    const rest = `${row.title} ${raw}`
      .replace("2026.12.01~2027.01.31", "")
      .replace(/820000~950000/g, "");
    for (const tail of ["1234", "5678", "1201", "0101234", "021201"]) {
      expect(rest).not.toContain(tail);
    }
  });

  it("BR-14 (P2a QA run 6 D-7, Q-21): numbers marked with %, ) or a minute next to a date are masked", async () => {
    const d7 = [
      "문의 010%-1234%-5678% 2026.12.01",
      "2026.12.01 010%1234%5678%",
      "문의 +82% 10% 1234% 5678% 2026.12.01",
      "문의 02% 1234% 2026.12",
      "문의 +82) 10) 2026.12.01",
      "문의 10:02 2026.12.01",
      "문의 9:02 2026년 12월 01일",
    ];
    const item = leadItem({
      title: "문의 010%1234%5678% 2026.12.01",
      // a word between the phrases keeps their digit runs apart
      memo: d7.join(" 다음 "),
      nested: { note: "문의 10:02 2026-12-01 입사" },
    });
    const res = await post([item]);
    expect(res.status).toBe(200);
    expect(((await res.json()) as Body).created).toBe(1);
    const row = await prisma.jobLead.findUniqueOrThrow({
      where: { sourceRef: item.sourceRef as string },
    });
    expect(row.title).toBe("문의 ***% 2026.12.01");
    const raw = JSON.stringify(row.rawJson);
    expect(raw).toContain(
      "문의 ***% 2026.12.01 다음 2026.12.01 ***% 다음 문의 ***% 2026.12.01 다음 문의 ***.12 다음 문의 *** 다음 문의 10:*** 다음 문의 9:***일",
    );
    expect(raw).toContain("문의 10:*** 입사");
    // no 4 or more phone digits left (years aside)
    const rest = `${row.title} ${raw}`.replace(/(?:19|20)\d\d/g, "");
    for (const tail of ["1234", "5678", "0101234"]) {
      expect(rest).not.toContain(tail);
    }
  });

  it("R-115: a DO_NOT_CONTACT lead keeps its grade when collected again", async () => {
    const item = leadItem();
    await post([item]);
    await prisma.jobLead.update({
      where: { sourceRef: item.sourceRef as string },
      data: { grade: "DO_NOT_CONTACT" },
    });
    const again = await post([{ ...item, title: "다시 올라온 공고" }]);
    expect(((await again.json()) as Body).updated).toBe(1);
    const row = await prisma.jobLead.findUniqueOrThrow({
      where: { sourceRef: item.sourceRef as string },
    });
    expect(row.grade).toBe("DO_NOT_CONTACT");
    expect(row.title).toBe("다시 올라온 공고");
  });

  it("R-129: 429 with Retry-After once the key is over its limit", async () => {
    const key = randomBytes(32).toString("base64url");
    process.env.INGEST_API_KEY = key;
    // one fixed clock for the filling and the request, so they share a window
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-16T05:00:10Z"));
    try {
      const bucket = `ingest:key:${rateLimitSubject(key)}`;
      for (let i = 0; i < RATE_LIMITS.ingestPerKey.limit; i++) {
        await consumeRateLimit(bucket, RATE_LIMITS.ingestPerKey);
      }
      const res = await post(batch(1), key);
      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toMatch(/^[0-9]+$/);
      expect(await res.json()).toEqual({
        error: { code: "RATE_LIMITED", message: "too many requests" },
      });
    } finally {
      vi.useRealTimers();
      process.env.INGEST_API_KEY = KEY;
    }
  });
});
