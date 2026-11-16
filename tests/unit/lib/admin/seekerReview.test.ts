/**
 * R-120: "조건 미충족 승격 거부, 등급 변경 시 AuditLog 생성 테스트" (WO §7.6, BR-07, BR-15).
 */
import { afterAll, describe, expect, it } from "vitest";

import { SEEKER_S_ACTIVE_CONFIRM_DAYS } from "@/config/limits";
import {
  changeSeekerGrade,
  changeSeekerTrack,
  checkGradeChange,
  setConvertibility,
  updateReviewFlags,
} from "@/lib/admin/seekerReview";
import { db } from "@/lib/db";

import { uniq } from "../../db/helpers";
import { DAY_MS, auditRows, seeker, staffUser } from "./adminFixtures";

afterAll(() => db.$disconnect());

const NOW = new Date("2032-06-01T03:00:00Z");

async function gradeOf(id: string) {
  return (await db.seekerProfile.findUniqueOrThrow({ where: { id } })).grade;
}

describe("R-120 grade rules (pure)", () => {
  const base = {
    grade: "B" as const,
    consultedAt: null,
    verifiedVisa: false,
    verifiedKorean: false,
    status: "ACTIVE" as const,
    lastActiveConfirmedAt: NOW,
  };

  it("R-120: B→A needs 상담 + 체류자격 확인; B→S directly is refused", () => {
    expect(checkGradeChange(base, "A", NOW)).toEqual({
      ok: false,
      code: "REQUIREMENTS_UNMET",
      missing: ["CONSULTED", "VERIFIED_VISA"],
    });
    expect(checkGradeChange({ ...base, consultedAt: NOW }, "A", NOW)).toMatchObject({
      missing: ["VERIFIED_VISA"],
    });
    expect(checkGradeChange({ ...base, consultedAt: NOW, verifiedVisa: true }, "A", NOW)).toEqual({
      ok: true,
      direction: "UP",
    });
    expect(checkGradeChange(base, "S", NOW)).toEqual({ ok: false, code: "GRADE_STEP" });
    expect(checkGradeChange(base, "B", NOW)).toEqual({ ok: false, code: "SAME_GRADE" });
  });

  it("R-120: A→S needs 한국어 확인 + ACTIVE + status check within the window", () => {
    const a = { ...base, grade: "A" as const, consultedAt: NOW, verifiedVisa: true };
    expect(checkGradeChange(a, "S", NOW)).toMatchObject({ missing: ["VERIFIED_KOREAN"] });
    const stale = new Date(NOW.getTime() - (SEEKER_S_ACTIVE_CONFIRM_DAYS + 1) * DAY_MS);
    expect(
      checkGradeChange(
        { ...a, verifiedKorean: true, status: "INACTIVE", lastActiveConfirmedAt: stale },
        "S",
        NOW,
      ),
    ).toMatchObject({ missing: ["ACTIVE", "RECENT_CONFIRM"] });
    const edge = new Date(NOW.getTime() - SEEKER_S_ACTIVE_CONFIRM_DAYS * DAY_MS);
    expect(
      checkGradeChange({ ...a, verifiedKorean: true, lastActiveConfirmedAt: edge }, "S", NOW),
    ).toEqual({ ok: true, direction: "UP" });
    expect(checkGradeChange({ ...a, grade: "S" }, "B", NOW)).toEqual({
      ok: true,
      direction: "DOWN",
    });
  });
});

describe("R-120 grade change (DB + AuditLog)", () => {
  it("R-120: unmet promotion is refused, grade unchanged, no AuditLog", async () => {
    const staff = await staffUser();
    const s = await seeker(uniq("rev"), { consultedAt: NOW }); // no verifiedVisa
    const r = await changeSeekerGrade({ actorId: staff.id, seekerId: s.id, to: "A", now: NOW });
    expect(r).toEqual({ ok: false, code: "REQUIREMENTS_UNMET", missing: ["VERIFIED_VISA"] });
    expect(await gradeOf(s.id)).toBe("B");
    expect(await auditRows(s.id, "SEEKER_GRADE_CHANGE")).toHaveLength(0);
  });

  it("R-120: B→A→S with all conditions writes one SEEKER_GRADE_CHANGE per step", async () => {
    const staff = await staffUser();
    const s = await seeker(uniq("rev"));
    expect(
      await updateReviewFlags({
        actorId: staff.id,
        seekerId: s.id,
        patch: { consulted: true, verifiedVisa: true },
        now: NOW,
      }),
    ).toEqual({ ok: true });
    expect(
      await changeSeekerGrade({ actorId: staff.id, seekerId: s.id, to: "A", now: NOW }),
    ).toEqual({ ok: true });
    // S refused until 한국어 확인; status check is recent (lastActiveConfirmedAt = now at create)
    const later = new Date();
    expect(
      await changeSeekerGrade({ actorId: staff.id, seekerId: s.id, to: "S", now: later }),
    ).toMatchObject({ ok: false, missing: ["VERIFIED_KOREAN"] });
    await updateReviewFlags({ actorId: staff.id, seekerId: s.id, patch: { verifiedKorean: true } });
    expect(
      await changeSeekerGrade({ actorId: staff.id, seekerId: s.id, to: "S", now: later }),
    ).toEqual({ ok: true });
    expect(await gradeOf(s.id)).toBe("S");

    const grades = await auditRows(s.id, "SEEKER_GRADE_CHANGE");
    expect(grades.map((g) => g.meta)).toEqual([
      { from: "B", to: "A" },
      { from: "A", to: "S" },
    ]);
    expect(grades.every((g) => g.actorId === staff.id && g.entity === "SeekerProfile")).toBe(true);

    const reviews = await auditRows(s.id, "SEEKER_REVIEW_UPDATE");
    expect(reviews).toHaveLength(2);
    expect(reviews[0].meta).toEqual({
      changes: {
        consultedAt: { from: false, to: true },
        verifiedVisa: { from: false, to: true },
      },
    });

    // A check the grade depends on cannot be cleared; demote first.
    expect(
      await updateReviewFlags({
        actorId: staff.id,
        seekerId: s.id,
        patch: { verifiedKorean: false },
      }),
    ).toEqual({ ok: false, code: "GRADE_DEPENDS" });
    expect(await changeSeekerGrade({ actorId: staff.id, seekerId: s.id, to: "B" })).toEqual({
      ok: true,
    });
    expect((await auditRows(s.id, "SEEKER_GRADE_CHANGE")).at(-1)?.meta).toEqual({
      from: "S",
      to: "B",
    });
  });

  it("R-120: the conditional update refuses a promotion whose condition vanished meanwhile", async () => {
    const staff = await staffUser();
    const s = await seeker(uniq("rev"), {
      grade: "A",
      consultedAt: NOW,
      verifiedVisa: true,
      verifiedKorean: true,
      status: "INACTIVE",
    });
    const r = await changeSeekerGrade({ actorId: staff.id, seekerId: s.id, to: "S" });
    expect(r).toMatchObject({ ok: false, code: "REQUIREMENTS_UNMET", missing: ["ACTIVE"] });
    expect(await gradeOf(s.id)).toBe("A");
  });
});

describe("R-120 track and conversion judgement", () => {
  it("R-120 / BR-07: FUTURE_POOL visa cannot leave FUTURE_POOL; other changes write SEEKER_TRACK_CHANGE", async () => {
    const staff = await staffUser();
    const futureVisa = await db.visaType.findFirst({ where: { defaultTrack: "FUTURE_POOL" } });
    expect(futureVisa).not.toBeNull();
    const locked = await seeker(uniq("trk"), { visaCode: futureVisa!.code, track: "FUTURE_POOL" });
    expect(
      await changeSeekerTrack({ actorId: staff.id, seekerId: locked.id, to: "JOB_MATCH" }),
    ).toEqual({ ok: false, code: "FUTURE_POOL_LOCKED" });
    expect(await auditRows(locked.id, "SEEKER_TRACK_CHANGE")).toHaveLength(0);

    const jobVisa = await db.visaType.findFirstOrThrow({ where: { defaultTrack: "JOB_MATCH" } });
    const s = await seeker(uniq("trk"), { visaCode: jobVisa.code, track: "JOB_MATCH" });
    expect(
      await changeSeekerTrack({ actorId: staff.id, seekerId: s.id, to: "CONSULT_ONLY" }),
    ).toEqual({ ok: true });
    expect((await auditRows(s.id, "SEEKER_TRACK_CHANGE")).map((r) => r.meta)).toEqual([
      { from: "JOB_MATCH", to: "CONSULT_ONLY" },
    ]);
  });

  it("R-120: 전환 가능성 accepts VisaType data codes only and writes SEEKER_REVIEW_UPDATE", async () => {
    const staff = await staffUser();
    const s = await seeker(uniq("cnv"));
    expect(
      await setConvertibility({
        actorId: staff.id,
        seekerId: s.id,
        convertibleVisa: "NOT-A-VISA",
        convertibleAt: null,
      }),
    ).toEqual({ ok: false, code: "UNKNOWN_VISA" });
    const visa = await db.visaType.findFirstOrThrow({
      where: { isStatusCode: true, active: true },
    });
    const at = new Date("2033-01-01T00:00:00Z");
    expect(
      await setConvertibility({
        actorId: staff.id,
        seekerId: s.id,
        convertibleVisa: visa.code,
        convertibleAt: at,
      }),
    ).toEqual({ ok: true });
    const row = await db.seekerProfile.findUniqueOrThrow({ where: { id: s.id } });
    expect(row.convertibleVisa).toBe(visa.code);
    expect(row.convertibleAt?.toISOString()).toBe(at.toISOString());
    const logs = await auditRows(s.id, "SEEKER_REVIEW_UPDATE");
    expect(logs).toHaveLength(1);
    expect(logs[0].meta).toMatchObject({
      changes: { convertibleVisa: { from: null, to: visa.code } },
    });
  });
});
