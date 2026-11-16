/**
 * R-122: "복호 필드를 관리자 화면에서 열람 시 PII_VIEW 기록 테스트". The admin screens get decrypted
 * values only through these functions; list / detail loaders select no encrypted field.
 */
import { afterAll, describe, expect, it } from "vitest";

import {
  LEAD_CONTACT_FIELDS,
  buildLeadBoard,
  getLeadDetail,
  revealLeadContact,
} from "@/lib/admin/leadDesk";
import {
  PII_GROUPS,
  SEEKER_REVIEW_SELECT,
  getSeekerForReview,
  listSeekersForReview,
  revealSeekerPii,
} from "@/lib/admin/seekerReview";
import { db } from "@/lib/db";

import { uniq } from "../../db/helpers";
import { auditRows, lead, seeker, staffUser } from "./adminFixtures";

afterAll(() => db.$disconnect());

describe("R-122 PII_VIEW", () => {
  it("R-122: revealing seeker fields writes PII_VIEW with field names only, per reveal", async () => {
    const staff = await staffUser("ADMIN");
    const phone = "+821055551234";
    const user = await db.user.create({ data: { role: "SEEKER", phoneEnc: phone } });
    const s = await db.seekerProfile.create({
      data: {
        userId: user.id,
        referralCode: uniq("P").slice(-20),
        legalNameEnc: "NGUYEN VAN A",
        emailEnc: "nguyen@example.test",
        messengerType: "ZALO",
        messengerIdEnc: "zalo-nguyen",
        schoolNameEnc: "하노이 대학",
      },
    });

    const basic = await revealSeekerPii({ actorId: staff.id, seekerId: s.id, group: "basic" });
    expect(basic).toMatchObject({
      group: "basic",
      legalName: "NGUYEN VAN A",
      schoolName: "하노이 대학",
    });
    const contact = await revealSeekerPii({ actorId: staff.id, seekerId: s.id, group: "contact" });
    expect(contact).toMatchObject({
      phone,
      email: "nguyen@example.test",
      messengerId: "zalo-nguyen",
    });

    const views = await auditRows(s.id, "PII_VIEW");
    expect(views).toHaveLength(2);
    expect(views.map((v) => v.meta)).toEqual([
      { fields: [...PII_GROUPS.basic] },
      { fields: [...PII_GROUPS.contact] },
    ]);
    expect(views.every((v) => v.actorId === staff.id && v.entity === "SeekerProfile")).toBe(true);
    const logged = JSON.stringify(views.map((v) => v.meta));
    for (const value of ["NGUYEN", phone, "nguyen@example.test", "zalo-nguyen", "하노이"]) {
      expect(logged).not.toContain(value);
    }
  });

  it("R-122: revealing a lead contact writes PII_VIEW; unknown ids write nothing", async () => {
    const staff = await staffUser("STAFF_PLACEMENT");
    const l = await lead(uniq("pii"), {
      contactNameEnc: "김담당",
      contactPhoneEnc: "01098765432",
      contactEmailEnc: "hr@example.test",
    });
    expect(await revealLeadContact({ actorId: staff.id, leadId: l.id })).toEqual({
      name: "김담당",
      phone: "01098765432",
      email: "hr@example.test",
    });
    const views = await auditRows(l.id, "PII_VIEW");
    expect(views).toHaveLength(1);
    expect(views[0]).toMatchObject({
      entity: "JobLead",
      meta: { fields: [...LEAD_CONTACT_FIELDS] },
    });

    expect(await revealLeadContact({ actorId: staff.id, leadId: "missing" })).toBeNull();
    expect(await auditRows("missing", "PII_VIEW")).toHaveLength(0);
  });

  it("R-122: list and detail loaders carry no encrypted field (so no unlogged view)", async () => {
    expect(Object.keys(SEEKER_REVIEW_SELECT).some((k) => k.endsWith("Enc"))).toBe(false);
    const s = await seeker(uniq("pii"), { legalNameEnc: "HIDDEN NAME" });
    const detail = await getSeekerForReview(s.id);
    expect(JSON.stringify(detail)).not.toContain("HIDDEN NAME");
    const { rows } = await listSeekersForReview("NEW", { take: 500 });
    expect(JSON.stringify(rows)).not.toContain("HIDDEN NAME");

    const tag = uniq("piiL");
    const l = await lead(tag, { contactPhoneEnc: "01011112222", contactNameEnc: "숨김담당" });
    const leadDetail = await getLeadDetail(l.id);
    const board = await buildLeadBoard(new Date(), { scope: { sourceRef: { startsWith: tag } } });
    for (const json of [JSON.stringify(leadDetail), JSON.stringify(board)]) {
      expect(json).not.toContain("01011112222");
      expect(json).not.toContain("숨김담당");
      expect(json).not.toMatch(/Enc"/);
    }
    expect(await auditRows(s.id, "PII_VIEW")).toHaveLength(0);
    expect(await auditRows(l.id, "PII_VIEW")).toHaveLength(0);
  });
});
