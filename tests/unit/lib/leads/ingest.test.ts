/**
 * R-114 / R-115 / WO §8.1: ingest rules below the route — grades on re-ingest (transitions.ts),
 * tagging, rawJson without plain contacts, encrypted contact columns.
 */
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  ingestJobLeads,
  isBusinessNumberKey,
  isContactKey,
  isPhoneShapedNumber,
  isReservedSourceRef,
  sanitizeRaw,
} from "@/lib/leads/ingest";

import { testPrisma } from "../../db/helpers";
import { leadItem } from "./leadFixtures";

const prisma = testPrisma();
afterAll(() => prisma.$disconnect());

const DAY_MS = 86_400_000;

async function row(sourceRef: string) {
  return prisma.jobLead.findUniqueOrThrow({ where: { sourceRef } });
}

describe("R-114 ingestJobLeads", () => {
  it("tags 시·도 / 시·군·구 codes, KSIC section and the 인구감소지역 flag from the seed tables", async () => {
    const depop = await prisma.region.findFirstOrThrow({
      where: { level: "SIGUNGU", depopulationArea: true },
      include: { parent: true },
    });
    const item = leadItem({
      sido: depop.parent?.nameKo,
      sigungu: depop.nameKo,
      industryCode: "C2511",
    });
    const r = await ingestJobLeads([item]);
    expect(r).toEqual({ created: 1, updated: 0, rejected: [] });
    const lead = await row(item.sourceRef as string);
    expect(lead).toMatchObject({
      sido: depop.parentCode,
      sigungu: depop.code,
      depopulationArea: true,
      industryCode: "C",
      grade: "C",
      source: "WORK24_API",
    });
  });

  it("keeps contacts out of rawJson in plain text and stores them only encrypted", async () => {
    const item = leadItem({
      contactName: "홍길동",
      contactPhone: "010-2345-6789",
      contactEmail: "hr@example.com",
      description: "문의 010-2345-6789 / hr@example.com 로 연락",
    });
    await ingestJobLeads([item]);
    const [raw] = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT "rawJson"::text AS raw, "contactPhoneEnc", "contactNameEnc", "contactEmailEnc", "contactPhoneHash" FROM "JobLead" WHERE "sourceRef" = $1`,
      item.sourceRef,
    );
    const text = String(raw.raw);
    expect(text).not.toContain("2345");
    expect(text).not.toContain("hr@example.com");
    expect(text).not.toContain("홍길동");
    expect(text).toContain("***");
    for (const col of ["contactPhoneEnc", "contactNameEnc", "contactEmailEnc"]) {
      expect(String(raw[col])).toMatch(/^v[0-9]+:/);
    }
    expect(String(raw.contactPhoneHash)).toMatch(/^[0-9a-f]{64}$/);
    // the app reads them back through the encryption extension
    const lead = await db.jobLead.findUniqueOrThrow({
      where: { sourceRef: item.sourceRef as string },
    });
    expect(lead.contactPhoneEnc).toBe("+821023456789");
    expect(lead.contactNameEnc).toBe("홍길동");
  });

  it("R-115 + WO §8.2: re-ingest keeps C, B, A and DO_NOT_CONTACT", async () => {
    for (const grade of ["C", "B", "A", "DO_NOT_CONTACT"] as const) {
      const item = leadItem();
      await ingestJobLeads([item]);
      await prisma.jobLead.update({
        where: { sourceRef: item.sourceRef as string },
        data: { grade },
      });
      const r = await ingestJobLeads([{ ...item, postedAt: new Date().toISOString() }]);
      expect(r.updated).toBe(1);
      expect((await row(item.sourceRef as string)).grade).toBe(grade);
    }
  });

  it("ARCHIVED stays ARCHIVED unless the source shows the posting again after the archive", async () => {
    const now = new Date();
    const item = leadItem({ postedAt: new Date(now.getTime() - 40 * DAY_MS).toISOString() });
    await ingestJobLeads([item], now);
    const lead = await prisma.jobLead.update({
      where: { sourceRef: item.sourceRef as string },
      data: { grade: "ARCHIVED", archivedAt: new Date(now.getTime() - 5 * DAY_MS) },
    });

    // same posting date → still ARCHIVED, no audit
    await ingestJobLeads([item], now);
    expect((await row(item.sourceRef as string)).grade).toBe("ARCHIVED");

    // re-posted after the archive → back to C with LEAD_GRADE_CHANGE (actor SYSTEM)
    await ingestJobLeads(
      [{ ...item, postedAt: new Date(now.getTime() - DAY_MS).toISOString() }],
      now,
    );
    const revived = await row(item.sourceRef as string);
    expect(revived.grade).toBe("C");
    expect(revived.archivedAt).toBeNull();
    const logs = await prisma.auditLog.findMany({ where: { entityId: lead.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      action: "LEAD_GRADE_CHANGE",
      actorId: "SYSTEM",
      meta: { from: "ARCHIVED", to: "C", reason: "INGEST_REPOSTED" },
    });
  });

  it("contact columns are kept when a later delivery has no contact", async () => {
    const item = leadItem({ contactPhone: "010-3456-7890" });
    await ingestJobLeads([item]);
    const { contactPhone: _c, ...withoutContact } = item;
    void _c;
    await ingestJobLeads([withoutContact]);
    const lead = await db.jobLead.findUniqueOrThrow({
      where: { sourceRef: item.sourceRef as string },
    });
    expect(lead.contactPhoneEnc).toBe("+821034567890");
  });

  it("O-1 masks contacts in the title / companyName columns and phone-like numbers in rawJson", async () => {
    const item = leadItem({
      title: "생산직 문의 010-9876-5432 카톡 qahr77",
      companyName: "큐에이 엣지 010-9876-5432",
      tel: 1098765432,
      extra: { fax: 15881234, hp_no: "1588-1234", headcount: 3, memo: "급여 2500000" },
    });
    await ingestJobLeads([item]);
    const [raw] = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT row_to_json(j)::text AS whole, j."title", j."companyName", j."rawJson"::text AS raw FROM "JobLead" j WHERE "sourceRef" = $1`,
      item.sourceRef,
    );
    const whole = String(raw.whole);
    for (const plain of ["9876", "5432", "qahr77", "1098765432", "15881234", "1588-1234"]) {
      expect(whole).not.toContain(plain);
    }
    expect(raw.title).toBe("생산직 문의 *** ***");
    // the company name itself stays, only the contact span is replaced
    expect(raw.companyName).toBe("큐에이 엣지 ***");
    const json = JSON.parse(String(raw.raw)) as Record<string, unknown>;
    expect(json.tel).toBe("***");
    expect(json.extra).toEqual({ fax: "***", hp_no: "***", headcount: 3, memo: "급여 2500000" });
    expect(json.payMin).toBe(2_500_000);
  });

  it("O-2 keeps stored values for keys a re-delivery does not carry, clears explicit null", async () => {
    const item = leadItem({
      bizRegNo: "123-45-67890",
      foreignIntent: true,
      contactName: "김담당",
      contactPhone: "010-4567-8901",
      contactEmail: "hr2@example.com",
    });
    await ingestJobLeads([item]);
    const before = await db.jobLead.findUniqueOrThrow({
      where: { sourceRef: item.sourceRef as string },
    });
    expect(before).toMatchObject({ industryCode: "C", sigungu: expect.any(String) });

    // 1) only the required keys: every optional column keeps its value (any grade, here DNC)
    await prisma.jobLead.update({ where: { id: before.id }, data: { grade: "DO_NOT_CONTACT" } });
    const minimal = {
      sourceRef: item.sourceRef,
      companyName: item.companyName,
      title: "생산직 재게시",
      industryName: undefined,
    };
    expect(await ingestJobLeads([minimal])).toEqual({ created: 0, updated: 1, rejected: [] });
    const kept = await db.jobLead.findUniqueOrThrow({ where: { id: before.id } });
    expect(kept).toMatchObject({
      grade: "DO_NOT_CONTACT",
      source: "WORK24_API",
      title: "생산직 재게시",
      industryCode: before.industryCode,
      sido: before.sido,
      sigungu: before.sigungu,
      depopulationArea: before.depopulationArea,
      bizRegNo: "1234567890",
      payMin: before.payMin,
      payMax: before.payMax,
      postedAt: before.postedAt,
      closesAt: before.closesAt,
      foreignIntent: true,
      contactNameEnc: "김담당",
      contactPhoneEnc: "+821045678901",
      contactPhoneHash: before.contactPhoneHash,
      contactEmailEnc: "hr2@example.com",
    });

    // 2) explicit null clears the column; other carried keys replace, absent keys stay
    await ingestJobLeads([
      {
        ...minimal,
        industryName: null,
        industryCode: null,
        payMax: null,
        foreignIntent: null,
        contactPhone: null,
        contactEmail: "  ",
      },
    ]);
    const cleared = await db.jobLead.findUniqueOrThrow({ where: { id: before.id } });
    expect(cleared).toMatchObject({
      industryCode: null,
      payMax: null,
      foreignIntent: null,
      contactPhoneEnc: null,
      contactPhoneHash: null,
      contactEmailEnc: null,
      // not carried → kept
      payMin: before.payMin,
      sido: before.sido,
      sigungu: before.sigungu,
      contactNameEnc: "김담당",
      bizRegNo: "1234567890",
    });

    // 3) a region key carried without a known 시·도 rejects the item and leaves the row as it is
    const r = await ingestJobLeads([{ ...minimal, sido: null, sigungu: null, address: null }]);
    expect(r.rejected).toEqual([{ sourceRef: item.sourceRef, reason: "UNKNOWN_REGION" }]);
    expect((await row(item.sourceRef as string)).sido).toBe(before.sido);
  });

  it("O-2 a new lead without any region key is still rejected (sido is required)", async () => {
    const { sido: _s, sigungu: _g, ...noRegion } = leadItem();
    void _s;
    void _g;
    const r = await ingestJobLeads([noRegion]);
    expect(r).toEqual({
      created: 0,
      updated: 0,
      rejected: [{ sourceRef: noRegion.sourceRef, reason: "UNKNOWN_REGION" }],
    });
  });

  it("helpers: reserved refs and rawJson sanitising", () => {
    expect(isReservedSourceRef("DIAGNOSIS:abc")).toBe(true);
    expect(isReservedSourceRef("request:abc")).toBe(true);
    expect(isReservedSourceRef("W24-1")).toBe(false);
    expect(
      sanitizeRaw({
        contactPhone: "010-1111-2222",
        nested: { memo: "카톡 hong123", n: 3, ok: true, list: ["hong@naver.com"] },
        nil: null,
      }),
    ).toEqual({ nested: { memo: "***", n: 3, ok: true, list: ["***"] }, nil: null });
    for (const key of [
      "tel",
      "telNo",
      "hp_no",
      "fax",
      "contactInfo",
      "e_mail",
      "연락처",
      "담당자",
    ]) {
      expect(isContactKey(key)).toBe(true);
    }
    for (const key of ["title", "companyName", "headcount", "shipping", "address", "n"]) {
      expect(isContactKey(key)).toBe(false);
    }
    expect(isPhoneShapedNumber(1098765432)).toBe(true); // 010-9876-5432 without the leading 0
    expect(isPhoneShapedNumber(821098765432)).toBe(true);
    expect(isPhoneShapedNumber(2_500_000)).toBe(false);
    expect(isPhoneShapedNumber(20261116)).toBe(false);
    expect(isPhoneShapedNumber(3)).toBe(false);
    expect(sanitizeRaw({ payMax: 1_000_000_000, contact: { name: "홍", no: 7 } })).toEqual({
      payMax: 1_000_000_000,
      contact: { name: "***", no: "***" },
    });
  });

  it("O-6 rawJson: counts / flags about contacts and business numbers are not over-masked", () => {
    // contact words match as whole words only; counts and flags about contacts are not contacts
    for (const key of [
      "cellCount",
      "phoneCount",
      "emailVerified",
      "faxYn",
      "hasPhone",
      "연락처수",
    ]) {
      expect(isContactKey(key)).toBe(false);
    }
    for (const key of ["telephone", "phoneNum", "cell_phone", "hpNo1", "휴대폰번호"]) {
      expect(isContactKey(key)).toBe(true);
    }
    for (const key of [
      "bizNum",
      "bizRegNo",
      "amount",
      "payAmount",
      "salaryWon",
      "price",
      "budget",
    ]) {
      expect(isBusinessNumberKey(key)).toBe(true);
    }
    for (const key of ["no", "value", "extra", "tel", "headOffice"]) {
      expect(isBusinessNumberKey(key)).toBe(false);
    }

    expect(
      sanitizeRaw({
        cellCount: 2,
        phoneCount: 3,
        emailVerified: true,
        faxYn: "N",
        extra: {
          bizNum: 1234567890,
          amount: 250_000_000,
          budget: 1_000_000_000,
          salary: 1_012_345_678,
          priceWon: 100_000_000,
          contact: { phoneCount: 1, verified: false },
        },
      }),
    ).toEqual({
      cellCount: 2,
      phoneCount: 3,
      emailVerified: true,
      faxYn: "N",
      extra: {
        bizNum: 1234567890,
        amount: 250_000_000,
        budget: 1_000_000_000,
        salary: 1_012_345_678,
        priceWon: 100_000_000,
        contact: { phoneCount: 1, verified: false },
      },
    });

    // contact values are still masked: under contact keys, under unknown keys when phone-shaped,
    // and a phone-shaped number never survives under a count / flag key either
    expect(
      sanitizeRaw({
        telephone: "02-123-4567",
        extra: {
          hpNo: 1098765432,
          contact: { no: 7, phone: 1055554444 },
          value: 1098765432,
          memo: "문의 010-9876-5432",
          phoneCount: 1098765432,
          faxYn: "051-123-4567",
          bizNum: "사업자 123-45-67890, 연락 010-1111-2222",
        },
        list: [1098765432],
      }),
    ).toEqual({
      telephone: "***",
      extra: {
        hpNo: "***",
        contact: { no: "***", phone: "***" },
        value: "***",
        memo: "문의 ***",
        phoneCount: "***",
        faxYn: "***",
        bizNum: expect.not.stringMatching(/010|1111|2222/),
      },
      list: ["***"],
    });
  });
});
