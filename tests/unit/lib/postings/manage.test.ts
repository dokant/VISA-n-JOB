/**
 * R-201 (PRD): "C·B 리드로 생성 시 서버 에러, verifiedBy/At 없이 공개 시 서버 에러 (WO §15-4), 공개 시
 * AuditLog". BR-05: postings only from grade-A leads. BR-03: no contact / company name in the text.
 */
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  closePosting,
  containsCompanyName,
  createPostingFromLead,
  publishPosting,
  verifyPosting,
} from "@/lib/postings/manage";
import type { PostingCreateInput } from "@/schemas/admin/postings";

import { auditRows, staffUser } from "../admin/adminFixtures";
import { gradedLead, postingInput } from "./postingFixtures";

afterAll(() => db.$disconnect());

describe("R-201 create only from grade-A leads (BR-05)", () => {
  it("R-201: C · B · 보관 · 재접촉금지 leads are refused on the server; no posting row", async () => {
    const staff = await staffUser("STAFF_PLACEMENT");
    for (const grade of ["C", "B", "ARCHIVED", "DO_NOT_CONTACT"] as const) {
      const lead = await gradedLead(grade);
      const r = await createPostingFromLead({ actorId: staff.id, input: postingInput(lead.id) });
      expect(r).toEqual({ ok: false, code: "LEAD_NOT_A" });
      expect(await db.jobPosting.count({ where: { leadId: lead.id } })).toBe(0);
    }
  });

  it("R-201: an A lead creates a DRAFT posting; a collected lead gets an unverified Company", async () => {
    const staff = await staffUser("STAFF_PLACEMENT");
    const lead = await gradedLead("A");
    const r = await createPostingFromLead({ actorId: staff.id, input: postingInput(lead.id) });
    expect(r.ok).toBe(true);
    const posting = await db.jobPosting.findFirstOrThrow({ where: { leadId: lead.id } });
    expect(posting).toMatchObject({ status: "DRAFT", verifiedAt: null, verifiedBy: null });
    expect(posting.eligibleVisas).toEqual(["F-4", "H-2"]);
    const linked = await db.jobLead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(linked.companyId).toBe(posting.companyId);
    const company = await db.company.findUniqueOrThrow({ where: { id: posting.companyId } });
    expect(company).toMatchObject({ verified: false, bizRegNoHash: null });
  });

  it("R-201 / BR-14: contact patterns in the blind title or role are refused", async () => {
    const staff = await staffUser("STAFF_PLACEMENT");
    const lead = await gradedLead("A");
    for (const over of [
      { blindTitle: "생산직 문의 010-1234-5678" },
      { role: "생산직 hr@example.com" },
    ]) {
      expect(
        await createPostingFromLead({ actorId: staff.id, input: postingInput(lead.id, over) }),
      ).toEqual({ ok: false, code: "TEXT_HAS_CONTACT" });
    }
  });

  it("R-201 / BR-03: the company name (any spacing, with or without 주식회사) is refused", async () => {
    const staff = await staffUser("STAFF_PLACEMENT");
    const lead = await gradedLead("A");
    expect(
      await createPostingFromLead({
        actorId: staff.id,
        input: postingInput(lead.id, { blindTitle: "한빛 정밀 생산직 모집" }),
      }),
    ).toEqual({ ok: false, code: "TEXT_HAS_COMPANY" });
    expect(containsCompanyName("(주)한빛정밀 공장", ["한빛정밀 주식회사"])).toBe(true);
    expect(containsCompanyName("서울 제조업 생산직", ["한빛정밀 주식회사"])).toBe(false);
  });

  it("R-201 / BR-03 (P2a QA D-2): symbols and invisible characters between the letters are ignored", () => {
    const names = ["이투이공고정밀 주식회사"];
    const hits = [
      "이투이/공고정밀 생산직",
      "이투이_공고정밀 생산직",
      "이투이~공고정밀",
      "이투이*공고정밀",
      "이투이+공고정밀",
      "이투이=공고정밀",
      "이투이|공고정밀",
      "이투이\\공고정밀",
      "이투이:공고정밀",
      "이투이\u200B공고정밀 생산직",
      "이투이\u200C공고\u200D정밀",
      "이투이\u2060공고\uFEFF정밀",
      "이투이\u00AD공고정밀",
      "이투이\u3164공고정밀",
      "㈜이투이공고정밀",
      "이투이\u3000공고정밀", // ideographic space
    ];
    for (const text of hits) expect(containsCompanyName(text, names), text).toBe(true);
    expect(
      containsCompanyName("ＨＡＮＢＩＴ-Precision 생산직", ["Hanbit Precision Co., Ltd."]),
    ).toBe(true);
    // ordinary job text with the same symbols stays negative
    for (const text of [
      "이투이 지역 / 공장 생산직",
      "공고 정밀 가공 / 2교대",
      "정밀_가공 생산직",
    ]) {
      expect(containsCompanyName(text, names), text).toBe(false);
    }
  });

  it("R-201 / BR-03 (P2a QA O-2): Latin corporate markers are dropped only as whole words", () => {
    // no false positive: "inc" inside "Vinco" / "Prince" is part of the name, not a marker
    expect(containsCompanyName("Novo 볼트 생산직", ["Vinco"])).toBe(false);
    expect(containsCompanyName("pre metal 생산직", ["Prince Metal"])).toBe(false);
    expect(containsCompanyName("인천(Incheon) 남동공단 생산직", ["Incheon Steel Inc."])).toBe(
      false,
    );
    expect(containsCompanyName("Incorporated 표기 없음 생산직", ["Corp Steel"])).toBe(false);
    // no miss: the name itself is still found, with or without its marker
    expect(containsCompanyName("Incheon Steel 협력 생산직", ["Cheon Steel"])).toBe(true);
    expect(containsCompanyName("Vinco 볼트 생산직", ["Vinco"])).toBe(true);
    expect(containsCompanyName("Prince-Metal 생산직", ["Prince Metal"])).toBe(true);
    expect(containsCompanyName("Incheon Steel 생산직", ["Incheon Steel Inc."])).toBe(true);
    expect(containsCompanyName("HANBIT PRECISION CO., LTD. 생산직", ["Hanbit Precision"])).toBe(
      true,
    );
    expect(containsCompanyName("Hanbit Precision 생산직", ["Hanbit Precision Co., Ltd."])).toBe(
      true,
    );
    expect(containsCompanyName("Doosan 생산직", ["Doosan Corp."])).toBe(true);
    expect(containsCompanyName("Vina Tech 생산직", ["VINA TECH LLC"])).toBe(true);
  });

  it("R-201 / BR-14 (P2a QA D-3, O-1): separators by category, keycaps and other digits are refused", async () => {
    const staff = await staffUser("STAFF_PLACEMENT");
    const lead = await gradedLead("A");
    for (const text of [
      "생산직 010ㅡ1234ㅡ5678",
      "생산직 010•1234•5678",
      "생산직 010・1234・5678",
      "생산직 010●1234●5678",
      "생산직 010→1234→5678",
      "생산직 0️⃣1️⃣0️⃣1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣8️⃣",
      "생산직 ٠١٠-١٢٣٤-٥٦٧٨",
      "생산직 零一零 一二三四 五六七八",
      "생산직 ㄱㅗㅇㅇㅣㄹㄱㅗㅇ ㅇㅣㄹㅇㅣㅅㅏㅁㅅㅏ ㅇㅗㅇㅠㄱㅊㅣㄹㅍㅏㄹ",
    ]) {
      expect(
        await createPostingFromLead({
          actorId: staff.id,
          input: postingInput(lead.id, { blindTitle: text }),
        }),
        text,
      ).toEqual({ ok: false, code: "TEXT_HAS_CONTACT" });
    }
    expect(
      await createPostingFromLead({
        actorId: staff.id,
        input: postingInput(lead.id, { role: "생산 010ㅡ1234ㅡ5678" }),
      }),
    ).toEqual({ ok: false, code: "TEXT_HAS_CONTACT" });
    expect(await db.jobPosting.count({ where: { leadId: lead.id } })).toBe(0);
    // ordinary text with the same symbols is accepted
    const ok = await createPostingFromLead({
      actorId: staff.id,
      input: postingInput(lead.id, {
        blindTitle: "• 숙소 제공 • 식사 3끼 · 09:00~18:00 · 250만원·300만 원",
        role: "주간 → 야간 교대",
      }),
    });
    expect(ok.ok).toBe(true);
  });

  it("R-201 / BR-14 (P2a QA run 3 D-4, O-1): date ranges and comma-less amount ranges are not contacts", async () => {
    const staff = await staffUser("STAFF_PLACEMENT");
    const lead = await gradedLead("A");
    const titles = [
      "근무 2026.12.01~2027.01.31",
      "2026.12.01 ~ 2027.01.31 단기",
      "2026-12-01~2027-01-31 근무",
      "2026. 12. 01 ~ 2027. 01. 31",
      "2026/12/01→2027/01/31",
      "일당 820000 ~ 950000",
      "일당 820000~950000원",
    ];
    for (const blindTitle of titles) {
      const r = await createPostingFromLead({
        actorId: staff.id,
        input: postingInput(lead.id, { blindTitle }),
      });
      expect(r.ok, blindTitle).toBe(true);
    }
    expect(
      await createPostingFromLead({
        actorId: staff.id,
        input: postingInput(lead.id, { role: "단기 2026.12.01~2027.01.31" }),
      }),
    ).toMatchObject({ ok: true });
    expect(await db.jobPosting.count({ where: { leadId: lead.id } })).toBe(titles.length + 1);
    // a number written as a date is still refused
    for (const blindTitle of ["생산직 010 2026.12.01", "생산직 010/12/01/5678"]) {
      expect(
        await createPostingFromLead({
          actorId: staff.id,
          input: postingInput(lead.id, { blindTitle }),
        }),
        blindTitle,
      ).toEqual({ ok: false, code: "TEXT_HAS_CONTACT" });
    }
  });

  it("R-201: unknown visa / region / industry codes are refused", async () => {
    const staff = await staffUser("STAFF_PLACEMENT");
    const lead = await gradedLead("A");
    const cases: Array<[Partial<PostingCreateInput>, string]> = [
      [{ eligibleVisas: ["Z-99"] }, "UNKNOWN_VISA"],
      [{ eligibleVisas: ["UNKNOWN"] }, "UNKNOWN_VISA"], // not a 체류자격 code
      [{ sido: "NOWHERE" }, "UNKNOWN_REGION"],
      [{ industryCode: "ZZ" }, "UNKNOWN_INDUSTRY"],
    ];
    for (const [over, code] of cases) {
      expect(
        await createPostingFromLead({ actorId: staff.id, input: postingInput(lead.id, over) }),
      ).toEqual({ ok: false, code });
    }
  });
});

describe("R-201 verify → publish (WO §15-4, BR-15)", () => {
  async function draft() {
    const staff = await staffUser("STAFF_PLACEMENT");
    const lead = await gradedLead("A");
    const r = await createPostingFromLead({ actorId: staff.id, input: postingInput(lead.id) });
    if (!r.ok) throw new Error(r.code);
    return { staff, lead, postingId: r.postingId };
  }

  it("WO15-04: publishing without verifiedBy / verifiedAt is a server error; no audit row", async () => {
    const { staff, postingId } = await draft();
    expect(await publishPosting({ actorId: staff.id, postingId })).toEqual({
      ok: false,
      code: "NOT_VERIFIED",
    });
    expect((await db.jobPosting.findUniqueOrThrow({ where: { id: postingId } })).status).toBe(
      "DRAFT",
    );
    expect(await auditRows(postingId, "POSTING_PUBLISH")).toHaveLength(0);
  });

  it("WO15-04: the database refuses a PUBLISHED row without verification (CHECK constraint)", async () => {
    const { postingId } = await draft();
    await expect(
      db.jobPosting.update({
        where: { id: postingId },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      }),
    ).rejects.toThrow(/JobPosting_published_requires_verification|check constraint/i);
  });

  it("R-201: verify records verifiedBy / verifiedAt; publish sets PUBLISHED + POSTING_PUBLISH audit", async () => {
    const { staff, lead, postingId } = await draft();
    const at = new Date("2026-11-17T01:00:00Z");
    expect(await verifyPosting({ actorId: staff.id, postingId, now: at })).toEqual({ ok: true });
    const verified = await db.jobPosting.findUniqueOrThrow({ where: { id: postingId } });
    expect(verified).toMatchObject({ verifiedBy: staff.id, verifiedAt: at, status: "DRAFT" });

    const publisher = await staffUser("ADMIN");
    expect(await publishPosting({ actorId: publisher.id, postingId })).toEqual({ ok: true });
    const published = await db.jobPosting.findUniqueOrThrow({ where: { id: postingId } });
    expect(published.status).toBe("PUBLISHED");
    expect(published.publishedAt).not.toBeNull();
    const audit = await auditRows(postingId, "POSTING_PUBLISH");
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ actorId: publisher.id, entity: "JobPosting" });
    expect(audit[0].meta).toEqual({ leadId: lead.id, verifiedBy: staff.id });

    // Publishing twice is refused (state), no second audit row.
    expect(await publishPosting({ actorId: publisher.id, postingId })).toEqual({
      ok: false,
      code: "POSTING_STATE",
    });
    expect(await auditRows(postingId, "POSTING_PUBLISH")).toHaveLength(1);
  });

  it("R-201 / BR-05: a lead that left grade A after creation blocks verification and publishing", async () => {
    const { staff, lead, postingId } = await draft();
    await verifyPosting({ actorId: staff.id, postingId });
    await db.jobLead.update({ where: { id: lead.id }, data: { grade: "DO_NOT_CONTACT" } });
    expect(await publishPosting({ actorId: staff.id, postingId })).toEqual({
      ok: false,
      code: "LEAD_NOT_A",
    });
    expect(await verifyPosting({ actorId: staff.id, postingId })).toEqual({
      ok: false,
      code: "LEAD_NOT_A",
    });
  });

  it("close: DRAFT / PUBLISHED → CLOSED once", async () => {
    const { staff, postingId } = await draft();
    expect(await closePosting({ actorId: staff.id, postingId })).toEqual({ ok: true });
    expect(await closePosting({ actorId: staff.id, postingId })).toEqual({
      ok: false,
      code: "POSTING_STATE",
    });
    expect(await verifyPosting({ actorId: staff.id, postingId })).toEqual({
      ok: false,
      code: "POSTING_STATE",
    });
  });
});
