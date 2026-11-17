/**
 * R-204 / WO15-01 / BR-02 / BR-14: the blind seeker serializer. Every seed profile (the SAMPLE
 * seekers of prisma/seed/sampleSeekers.ts and every row other tests wrote) serializes to a key set
 * that is a subset of — in fact equal to — BLIND_SEEKER_FIELDS; a fixed fixture is snapshotted
 * (tests/unit/lib/serializers/__snapshots__/blindSeeker.test.ts.snap holds the key list and the
 * values); personal data and free text never come out.
 */
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  BLIND_SEEKER_FIELDS,
  BLIND_SEEKER_SELECT,
  type BlindSeeker,
  type BlindSeekerRow,
  assertBlindKeys,
  experienceSummaryOf,
  fromBlindPublicId,
  isBlindPublicId,
  serializeBlindSeeker,
  toBlindPublicId,
  yearsInKoreaOf,
} from "@/lib/serializers/blindSeeker";
import { detectContacts } from "@/lib/pii-guard";

import { SAMPLE_SEEKERS, SAMPLE_SEEKER_CHANNEL } from "../../../../prisma/seed/sampleSeekers";
import {
  LEAK_EMAIL,
  LEAK_EMPLOYER,
  LEAK_MAJOR,
  LEAK_NAME,
  candidate,
  tag,
} from "../candidates/candidateFixtures";

afterAll(() => db.$disconnect());

/** WO §7.5, transcribed for the test (S-38: the constant must equal this list). */
const WO_7_5 = [
  "publicId",
  "nationality",
  "sido",
  "visaCode",
  "visaSubType",
  "stayRemainingBand",
  "yearsInKorea",
  "educationLevel",
  "majorField",
  "graduationDate",
  "topikLevel",
  "kiipStage",
  "koreanSpeaking",
  "otherLanguages",
  "experienceSummary",
  "skills",
  "licenses",
  "jobSearchStatus",
  "availableFrom",
  "desiredIndustries",
  "desiredRegions",
  "needDormitory",
  "shiftOk",
  "desiredPayMin",
  "groupApplySize",
  "grade",
  "verifiedVisa",
  "verifiedKorean",
  "convertibleVisa",
  "convertibleAt",
];

const NOW = new Date("2027-03-15T03:00:00.000Z"); // 2027-03-15 12:00 KST
const month = (y: number, m: number) => new Date(Date.UTC(y, m - 1, 1));

/** A fixed row for the snapshot (no database, no clock). */
const FIXTURE: BlindSeekerRow = {
  publicId: "0f1e2d3c-4b5a-4968-8776-a5b4c3d2e1f0",
  nationality: "UZ",
  sido: "CHUNGNAM",
  visaCode: "H-2",
  visaSubType: null,
  stayExpiry: month(2028, 1), // 10 months after March 2027
  entryYear: 2019,
  educationLevel: "BACHELOR",
  graduationDate: month(2016, 6),
  topikLevel: 4,
  kiipStage: 3,
  koreanSpeaking: 3,
  otherLanguages: ["ru", "en", "free text language"],
  skills: ["WELDING", "FORKLIFT", "made up skill"],
  licenses: ["FORKLIFT_LICENSE"],
  jobSearchStatus: "WITHIN_1M",
  availableFrom: new Date("2027-04-01T00:00:00.000Z"),
  desiredIndustries: ["C"],
  desiredRegions: ["CHUNGNAM", "ANY"],
  needDormitory: true,
  shiftOk: "CONDITIONAL",
  desiredPayMin: 2_800_000,
  grade: "S",
  verifiedVisa: true,
  verifiedKorean: true,
  convertibleVisa: "E-7-4",
  convertibleAt: month(2027, 9),
  experiences: [
    { industryCode: "C", role: "WELDING", months: 30 },
    { industryCode: "F", role: "a free text role", months: 12 },
    { industryCode: "not a code!", role: "WELDING", months: 6 },
  ],
};

describe("R-204 blindSeeker serializer", () => {
  it("S-38: BLIND_SEEKER_FIELDS equals WO §7.5", () => {
    expect([...BLIND_SEEKER_FIELDS]).toEqual(WO_7_5);
  });

  it("R-204 snapshot: key list and values of a fixed profile", () => {
    const out = serializeBlindSeeker(FIXTURE, { now: NOW, groupApplySize: 2 });
    expect(Object.keys(out)).toMatchSnapshot("keys");
    expect(out).toMatchSnapshot("values");
  });

  it("calculated values: stay band, years in Korea, experience summary, group size, majorField", () => {
    const out = serializeBlindSeeker(FIXTURE, { now: NOW, groupApplySize: 2 });
    expect(out.stayRemainingBand).toBe("M6_12");
    expect(out.yearsInKorea).toBe(8);
    expect(out.experienceSummary).toEqual([
      { industry: "C", role: "WELDING", months: 30 },
      { industry: "F", role: "OTHER", months: 12 },
    ]);
    expect(out.groupApplySize).toBe(2);
    expect(out.majorField).toBeNull();
    // free text in lists is dropped (BR-14)
    expect(out.otherLanguages).toEqual(["ru", "en"]);
    expect(out.skills).toEqual(["WELDING", "FORKLIFT"]);
    expect(out.graduationDate).toBe("2016-06");
    expect(out.availableFrom).toBe("2027-04-01");
    expect(out.convertibleAt).toBe("2027-09");
    // no group → null; a group of one is not a group
    expect(serializeBlindSeeker(FIXTURE, { now: NOW }).groupApplySize).toBeNull();
    expect(
      serializeBlindSeeker(FIXTURE, { now: NOW, groupApplySize: 1 }).groupApplySize,
    ).toBeNull();
    expect(yearsInKoreaOf(null, NOW)).toBeNull();
    expect(yearsInKoreaOf(2030, NOW)).toBe(0);
    expect(experienceSummaryOf(null)).toEqual([]);
  });

  it("stay bands: this month = M0_6, unknown expiry = UNKNOWN, 24+ months = M24_PLUS", () => {
    const at = (stayExpiry: Date | null) =>
      serializeBlindSeeker({ ...FIXTURE, stayExpiry }, { now: NOW }).stayRemainingBand;
    expect(at(month(2027, 3))).toBe("M0_6");
    expect(at(month(2027, 8))).toBe("M0_6");
    expect(at(month(2027, 9))).toBe("M6_12");
    expect(at(month(2028, 3))).toBe("M12_24");
    expect(at(month(2029, 3))).toBe("M24_PLUS");
    expect(at(null)).toBe("UNKNOWN");
  });

  it("the result is frozen and a key outside the list is refused (type + runtime)", () => {
    const out = serializeBlindSeeker(FIXTURE, { now: NOW });
    expect(Object.isFrozen(out)).toBe(true);
    expect(Object.isFrozen(out.skills)).toBe(true);
    expect(Object.isFrozen(out.experienceSummary[0])).toBe(true);
    expect(() => {
      (out as unknown as Record<string, unknown>).legalName = "x";
    }).toThrow();
    // @ts-expect-error — a key outside BLIND_SEEKER_FIELDS is a type error
    const extra: BlindSeeker = { ...out, phone: "010" };
    expect(() => assertBlindKeys(extra)).toThrow(/BLIND_SEEKER_FIELDS/);
  });

  it("publicId is the random public id written in letters, never the database id", () => {
    const blind = toBlindPublicId(FIXTURE.publicId);
    expect(isBlindPublicId(blind)).toBe(true);
    expect(blind).toMatch(/^[bcdfghjkmnpqrstv]{32}$/);
    expect(fromBlindPublicId(blind)).toBe(FIXTURE.publicId);
    expect(fromBlindPublicId("not-an-id")).toBeNull();
    expect(detectContacts(blind)).toEqual([]);
    expect(() => toBlindPublicId("cl0abc")).toThrow();
  });

  it("WO15-01: every seed profile (SAMPLE seekers + all rows in the DB) has keys ⊆ BLIND_SEEKER_FIELDS", async () => {
    // a profile full of personal data, written through the encrypting client
    const own = await candidate(tag("blind"));
    const samples = await db.seekerProfile.count({
      where: { sourceChannel: SAMPLE_SEEKER_CHANNEL },
    });
    expect(samples).toBe(SAMPLE_SEEKERS.length);

    const rows = await db.seekerProfile.findMany({ select: { ...BLIND_SEEKER_SELECT, id: true } });
    expect(rows.length).toBeGreaterThanOrEqual(SAMPLE_SEEKERS.length + 1);
    const allowed = new Set<string>(BLIND_SEEKER_FIELDS);
    for (const row of rows) {
      const out = serializeBlindSeeker(row);
      for (const key of Object.keys(out)) expect(allowed.has(key)).toBe(true);
      expect(out.publicId).not.toBe(row.id);
      const json = JSON.stringify(out);
      expect(json).not.toContain(row.id);
      if (row.id === own.id) {
        for (const secret of [LEAK_NAME, LEAK_EMAIL, LEAK_MAJOR, LEAK_EMPLOYER, "1995", "MALE"]) {
          expect(json).not.toContain(secret);
        }
      }
    }
  });

  it("BR-02: the select never reads personal, encrypted or free-text columns", () => {
    const selected = Object.keys(BLIND_SEEKER_SELECT);
    for (const forbidden of [
      "id",
      "userId",
      "legalNameEnc",
      "messengerIdEnc",
      "emailEnc",
      "schoolNameEnc",
      "birthYear",
      "gender",
      "major",
      "referralCode",
      "groupFriendCode",
      "sourceChannel",
      "nextVisaGoal",
      "consultTime",
      "noShowCount",
    ]) {
      expect(selected).not.toContain(forbidden);
    }
    expect(BLIND_SEEKER_SELECT.experiences.select).toEqual({
      industryCode: true,
      role: true,
      months: true,
    });
  });
});
