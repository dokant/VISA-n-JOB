/**
 * R-114 / R-115 / WO §8.1: ingest rules below the route — grades on re-ingest (transitions.ts),
 * tagging, rawJson without plain contacts, encrypted contact columns.
 */
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { ingestJobLeads, isReservedSourceRef, sanitizeRaw } from "@/lib/leads/ingest";

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
  });
});
