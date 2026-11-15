/**
 * R-005: after migrations every WO §5 model / enum (+ PRD §3 tables) exists in the DB,
 * and there are 0 resident / alien registration / passport number columns (BR-13).
 */
import { afterAll, describe, expect, inject, it } from "vitest";

import { testPrisma } from "./helpers";

const prisma = testPrisma();
afterAll(() => prisma.$disconnect());

/** WO §5 scalar fields per model (relation fields are not columns). */
const WO_MODELS: Record<string, string[]> = {
  User: [
    "id",
    "role",
    "phoneEnc",
    "phoneHash",
    "email",
    "password",
    "totpSecret",
    "locale",
    "createdAt",
  ],
  SeekerProfile: [
    "id",
    "userId",
    "legalNameEnc",
    "messengerType",
    "messengerIdEnc",
    "emailEnc",
    "birthYear",
    "gender",
    "nationality",
    "sido",
    "sigungu",
    "visaCode",
    "visaSubType",
    "stayExpiry",
    "entryYear",
    "hasArc",
    "pendingApplication",
    "educationLevel",
    "major",
    "schoolNameEnc",
    "graduationDate",
    "topikLevel",
    "kiipStage",
    "koreanSpeaking",
    "otherLanguages",
    "skills",
    "licenses",
    "desiredIndustries",
    "desiredRegions",
    "needDormitory",
    "shiftOk",
    "desiredPayMin",
    "availableFrom",
    "jobSearchStatus",
    "groupApply",
    "groupFriendCode",
    "nextVisaGoal",
    "wantsConsult",
    "track",
    "grade",
    "verifiedVisa",
    "verifiedKorean",
    "consultedAt",
    "convertibleVisa",
    "convertibleAt",
    "status",
    "lastActiveConfirmedAt",
    "noShowCount",
    "referralCode",
    "referredByCode",
    "sourceChannel",
    "isQuickSignup",
    "completedStep",
    "createdAt",
    "updatedAt",
  ],
  WorkExperience: [
    "id",
    "seekerId",
    "country",
    "industryCode",
    "role",
    "months",
    "employerNameEnc",
  ],
  Consent: ["id", "userId", "type", "version", "locale", "agreedAt", "revokedAt", "ipHash"],
  Company: [
    "id",
    "nameEnc",
    "bizRegNoEnc",
    "bizRegNoHash",
    "industryCode",
    "sido",
    "sigungu",
    "employeeCount",
    "verified",
    "contractSignedAt",
    "visaMandateAgreed",
  ],
  JobLead: [
    "id",
    "source",
    "sourceRef",
    "companyName",
    "bizRegNo",
    "industryCode",
    "sido",
    "sigungu",
    "title",
    "payMin",
    "payMax",
    "postedAt",
    "closesAt",
    "depopulationArea",
    "grade",
    "foreignIntent",
    "nextActionAt",
    "companyId",
    "rawJson",
    "createdAt",
    "archivedAt",
  ],
  CallLog: ["id", "leadId", "staffId", "outcome", "note", "at"],
  JobPosting: [
    "id",
    "companyId",
    "leadId",
    "blindTitle",
    "industryCode",
    "sido",
    "sigungu",
    "role",
    "payMin",
    "payMax",
    "overtimeNote",
    "dormitory",
    "meals",
    "shift",
    "headcount",
    "eligibleVisas",
    "status",
    "verifiedBy",
    "verifiedAt",
    "publishedAt",
  ],
  InterestRequest: ["id", "initiator", "seekerId", "postingId", "companyId", "status", "createdAt"],
  Recommendation: ["id", "seekerId", "companyId", "postingId", "staffId", "recommendedAt", "note"],
  Interview: [
    "id",
    "recommendationId",
    "scheduledAt",
    "place",
    "interpreter",
    "attended",
    "result",
    "introConfirmFile",
  ],
  Placement: ["id", "recommendationId", "contractDate", "monthlyWage", "feeAmount", "feeStatus"],
  VisaCase: [
    "id",
    "seekerId",
    "companyId",
    "caseType",
    "targetVisa",
    "status",
    "mandateSignedAt",
    "fee",
    "createdAt",
  ],
  VisaRule: [
    "id",
    "visaCode",
    "industryCode",
    "conditions",
    "outcome",
    "messageKey",
    "version",
    "status",
    "isSample",
    "reviewedBy",
    "reviewedAt",
  ],
  ScoreTable: ["id", "name", "version", "items", "passScore", "status", "isSample"],
  AgencyRequest: ["id", "agencyId", "summary", "visaCode", "status", "createdAt"],
  AuditLog: ["id", "actorId", "action", "entity", "entityId", "meta", "at"],
};

/** PRD §3 additional tables (+ RateLimitBucket from PLAN P0b) with their key columns. */
const PRD_TABLES: Record<string, string[]> = {
  VisaType: [
    "code",
    "nameKey",
    "defaultTrack",
    "registrable",
    "autoConsult",
    "needsVisaReview",
    "graduationWindowMonths",
    "graduationWindowTrack",
  ],
  Industry: ["code", "nameKo", "nameKey"],
  Region: ["code", "level", "parentCode", "nameKo", "depopulationArea", "isSample", "needsReview"],
  OtpChallenge: ["id", "phoneHash", "codeHash", "attempts", "expiresAt", "consumedAt"],
  StaffTask: ["id", "type", "status", "assigneeRole", "seekerId", "companyId", "leadId", "dueAt"],
  RateLimitBucket: ["key", "windowStart", "count"],
};

const WO_ENUMS: Record<string, string[]> = {
  Role: ["SEEKER", "EMPLOYER", "AGENCY", "STAFF_PLACEMENT", "STAFF_VISA", "ADMIN"],
  SeekerTrack: ["JOB_MATCH", "FUTURE_POOL", "CONSULT_ONLY"],
  SeekerGrade: ["B", "A", "S"],
  JobSearchStatus: ["IMMEDIATE", "WITHIN_1M", "EMPLOYED_OPEN", "NOT_SEARCHING"],
  SeekerStatus: ["ACTIVE", "INACTIVE", "EMPLOYED", "BLOCKED"],
  LeadGrade: ["C", "B", "A", "ARCHIVED", "DO_NOT_CONTACT"],
  PostingStatus: ["DRAFT", "PUBLISHED", "CLOSED"],
  RuleStatus: ["DRAFT", "PUBLISHED", "RETIRED"],
  Outcome: ["GREEN", "YELLOW", "RED"],
  // SC-10
  ShiftOk: ["YES", "NO", "CONDITIONAL", "UNKNOWN"],
};

type Col = { table_name: string; column_name: string; is_nullable: string; udt_name: string };

async function columns(): Promise<Col[]> {
  return prisma.$queryRaw<Col[]>`
    SELECT table_name, column_name, is_nullable, udt_name
    FROM information_schema.columns WHERE table_schema = 'public'`;
}

describe("R-005 schema", () => {
  it("test workers point DATABASE_URL (src/lib/db.ts) at the fresh per-run test database", () => {
    expect(process.env.DATABASE_URL).toBe(inject("databaseUrl"));
    expect(inject("databaseUrl")).toMatch(/127\.0\.0\.1:54329\/visanjob_test_/);
  });

  it("R-005: every WO §5 model and PRD §3 table exists with its WO fields", async () => {
    const cols = await columns();
    const byTable = new Map<string, Set<string>>();
    for (const c of cols) {
      if (!byTable.has(c.table_name)) byTable.set(c.table_name, new Set());
      byTable.get(c.table_name)!.add(c.column_name);
    }
    for (const [table, fields] of Object.entries({ ...WO_MODELS, ...PRD_TABLES })) {
      expect(byTable.has(table), `table ${table}`).toBe(true);
      const missing = fields.filter((f) => !byTable.get(table)!.has(f));
      expect(missing, `missing columns in ${table}`).toEqual([]);
    }
  });

  it("R-005: every WO §5 enum exists with exactly its values", async () => {
    const rows = await prisma.$queryRaw<{ typname: string; enumlabel: string }[]>`
      SELECT t.typname, e.enumlabel FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid ORDER BY t.typname, e.enumsortorder`;
    const enums = new Map<string, string[]>();
    for (const r of rows) enums.set(r.typname, [...(enums.get(r.typname) ?? []), r.enumlabel]);
    for (const [name, values] of Object.entries(WO_ENUMS)) {
      expect(enums.get(name), `enum ${name}`).toEqual(values);
    }
  });

  it("BR-13: 0 resident / alien registration / passport number columns", async () => {
    const cols = await columns();
    const forbidden =
      /passport|alien|rrn|resident|registrationno|registrationnumber|arcno|arcnumber|foreignerreg/i;
    expect(cols.filter((c) => forbidden.test(c.column_name)).map((c) => c.column_name)).toEqual([]);
    // PLAN pattern "arc": the only ARC column is the yes/no possession flag (WO §7.3 hasArc).
    // Word-level match on camelCase tokens ("hasArc" → has, Arc; "archivedAt" is not ARC).
    const words = (name: string) => name.split(/(?=[A-Z])/).map((w) => w.toLowerCase());
    const arc = cols.filter((c) => words(c.column_name).includes("arc"));
    expect(arc.map((c) => `${c.table_name}.${c.column_name}:${c.udt_name}`)).toEqual([
      "SeekerProfile.hasArc:bool",
    ]);
  });

  it("PC-3 / SC-10: wizard fields are nullable and shiftOk is the ShiftOk enum", async () => {
    const cols = (await columns()).filter((c) => c.table_name === "SeekerProfile");
    const col = (name: string) => cols.find((c) => c.column_name === name)!;
    for (const f of [
      "legalNameEnc",
      "nationality",
      "hasArc",
      "koreanSpeaking",
      "needDormitory",
      "shiftOk",
      "jobSearchStatus",
    ]) {
      expect(col(f).is_nullable, f).toBe("YES");
    }
    expect(col("shiftOk").udt_name).toBe("ShiftOk");
    expect(col("completedStep").is_nullable).toBe("NO");
  });

  it("encrypted / hashed identifiers follow the *Enc / *Hash naming (STANDARD 4.7)", async () => {
    const cols = await columns();
    const names = cols.map((c) => `${c.table_name}.${c.column_name}`);
    for (const n of [
      "User.phoneEnc",
      "User.phoneHash",
      "SeekerProfile.legalNameEnc",
      "SeekerProfile.messengerIdEnc",
      "SeekerProfile.emailEnc",
      "SeekerProfile.schoolNameEnc",
      "WorkExperience.employerNameEnc",
      "Company.nameEnc",
      "Company.bizRegNoEnc",
      "Company.bizRegNoHash",
    ]) {
      expect(names).toContain(n);
    }
  });
});
