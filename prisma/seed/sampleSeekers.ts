// SAMPLE — 테스트·개발용 가짜 구직자 (실제 개인 아님). 운영 DB에 넣지 않는다.
/**
 * Sample seeker profiles (PRD R-204 "시드에 테스트용 구직자 프로필 픽스처 포함", WO §15-1).
 *
 * Seeded only when asked for (`runSeed(prisma, { sampleSeekers: true })` — the Vitest test database,
 * or `SEED_SAMPLE_SEEKERS=true` outside production), never by default. Every row is tagged with
 * `sourceChannel = SAMPLE_SEED` and a `SMPL…` referral code, so it is recognisable and idempotent.
 *
 * The rows deliberately fill fields that must never reach an employer (birth year, gender, free-text
 * major, referral / friend codes, consult time, next visa goal, source channel) so the blind
 * serializer test proves they are dropped. `*Enc` columns are left empty: this seed uses a plain
 * Prisma client without the encryption extension, so it must not write plaintext into them.
 * They also cover the employer-visibility rule: eligible S / A rows, and E-9 (FUTURE_POOL), grade B,
 * revoked BLIND_PROFILE and NOT_SEARCHING rows that must stay hidden (BR-06, BR-07).
 */
import type {
  JobSearchStatus,
  PrismaClient,
  SeekerGrade,
  SeekerTrack,
  ShiftOk,
} from "@prisma/client";

export const SAMPLE_SEEKER_CHANNEL = "SAMPLE_SEED";

type SampleSeeker = {
  referralCode: string;
  grade: SeekerGrade;
  track: SeekerTrack;
  visaCode: string;
  visaSubType?: string;
  jobSearchStatus: JobSearchStatus;
  blindProfile: "GIVEN" | "REVOKED";
  nationality: string;
  sido: string;
  stayMonthsAhead: number;
  entryYear: number;
  birthYear: number;
  gender: string;
  major: string;
  /** Q-24 전공 분야 code (MAJOR_FIELDS) — the only major value employers see. */
  majorField: string;
  educationLevel: string;
  topikLevel: number;
  kiipStage: number;
  koreanSpeaking: number;
  otherLanguages: string[];
  skills: string[];
  licenses: string[];
  desiredIndustries: string[];
  desiredRegions: string[];
  needDormitory: boolean;
  shiftOk: ShiftOk;
  desiredPayMin: number | null;
  groupApply: boolean;
  groupFriendCode?: string;
  verifiedKorean: boolean;
  convertibleVisa?: string;
  convertibleMonthsAhead?: number;
  experiences: { country: string; industryCode: string; role: string; months: number }[];
};

export const SAMPLE_SEEKERS: readonly SampleSeeker[] = [
  {
    referralCode: "SMPL0001",
    grade: "S",
    track: "JOB_MATCH",
    visaCode: "F-4",
    jobSearchStatus: "IMMEDIATE",
    blindProfile: "GIVEN",
    nationality: "UZ",
    sido: "CHUNGNAM",
    stayMonthsAhead: 30,
    entryYear: 2019,
    birthYear: 1994,
    gender: "MALE",
    major: "Mechanical engineering, Tashkent",
    majorField: "ENGINEERING",
    educationLevel: "BACHELOR",
    topikLevel: 4,
    kiipStage: 3,
    koreanSpeaking: 3,
    otherLanguages: ["ru", "en"],
    skills: ["WELDING", "FORKLIFT"],
    licenses: ["FORKLIFT_LICENSE"],
    desiredIndustries: ["C"],
    desiredRegions: ["CHUNGNAM", "GYEONGGI"],
    needDormitory: true,
    shiftOk: "YES",
    desiredPayMin: 2_800_000,
    groupApply: true,
    verifiedKorean: true,
    experiences: [
      { country: "KR", industryCode: "C", role: "WELDING", months: 30 },
      { country: "UZ", industryCode: "F", role: "CONSTRUCTION", months: 12 },
    ],
  },
  {
    referralCode: "SMPL0002",
    grade: "A",
    track: "JOB_MATCH",
    visaCode: "H-2",
    jobSearchStatus: "WITHIN_1M",
    blindProfile: "GIVEN",
    nationality: "UZ",
    sido: "CHUNGNAM",
    stayMonthsAhead: 8,
    entryYear: 2022,
    birthYear: 1990,
    gender: "FEMALE",
    major: "Nursing",
    majorField: "HEALTH_WELFARE",
    educationLevel: "COLLEGE",
    topikLevel: 2,
    kiipStage: 1,
    koreanSpeaking: 2,
    otherLanguages: ["ru"],
    skills: ["PACKING", "ASSEMBLY"],
    licenses: [],
    desiredIndustries: ["C", "I"],
    desiredRegions: ["ANY"],
    needDormitory: true,
    shiftOk: "CONDITIONAL",
    desiredPayMin: null,
    groupApply: true,
    groupFriendCode: "SMPL0001",
    verifiedKorean: false,
    experiences: [{ country: "KR", industryCode: "C", role: "PACKING", months: 14 }],
  },
  {
    referralCode: "SMPL0003",
    grade: "A",
    track: "JOB_MATCH",
    visaCode: "E-7",
    visaSubType: "E-7-4",
    jobSearchStatus: "EMPLOYED_OPEN",
    blindProfile: "GIVEN",
    nationality: "VN",
    sido: "GYEONGGI",
    stayMonthsAhead: 15,
    entryYear: 2016,
    birthYear: 1988,
    gender: "NO_ANSWER",
    major: "Hanoi University of Industry — welding",
    majorField: "ENGINEERING",
    educationLevel: "HIGH_SCHOOL",
    topikLevel: 3,
    kiipStage: 5,
    koreanSpeaking: 4,
    otherLanguages: ["vi", "en"],
    skills: ["CNC", "ELECTRICAL"],
    licenses: ["WELDING_CERT", "KR_DRIVER_LICENSE"],
    desiredIndustries: ["C"],
    desiredRegions: ["GYEONGGI"],
    needDormitory: false,
    shiftOk: "NO",
    desiredPayMin: 3_000_000,
    groupApply: false,
    verifiedKorean: true,
    convertibleVisa: "F-2",
    convertibleMonthsAhead: 10,
    experiences: [{ country: "KR", industryCode: "C", role: "MACHINE_OPERATION", months: 84 }],
  },
  {
    // BR-07 / WO §15-6: E-9 is FUTURE_POOL — never a candidate, even at grade A.
    referralCode: "SMPL0004",
    grade: "A",
    track: "FUTURE_POOL",
    visaCode: "E-9",
    jobSearchStatus: "IMMEDIATE",
    blindProfile: "GIVEN",
    nationality: "KH",
    sido: "GYEONGBUK",
    stayMonthsAhead: 20,
    entryYear: 2021,
    birthYear: 1997,
    gender: "MALE",
    major: "",
    majorField: "GENERIC",
    educationLevel: "HIGH_SCHOOL",
    topikLevel: 2,
    kiipStage: 0,
    koreanSpeaking: 2,
    otherLanguages: [],
    skills: ["ASSEMBLY"],
    licenses: [],
    desiredIndustries: ["C"],
    desiredRegions: ["GYEONGBUK"],
    needDormitory: true,
    shiftOk: "YES",
    desiredPayMin: null,
    groupApply: false,
    verifiedKorean: false,
    experiences: [{ country: "KR", industryCode: "C", role: "ASSEMBLY", months: 30 }],
  },
  {
    // BR-06: grade B is never shown.
    referralCode: "SMPL0005",
    grade: "B",
    track: "JOB_MATCH",
    visaCode: "F-6",
    jobSearchStatus: "IMMEDIATE",
    blindProfile: "GIVEN",
    nationality: "PH",
    sido: "SEOUL",
    stayMonthsAhead: 40,
    entryYear: 2018,
    birthYear: 1992,
    gender: "FEMALE",
    major: "Business administration",
    majorField: "BUSINESS_LAW",
    educationLevel: "BACHELOR",
    topikLevel: 5,
    kiipStage: 4,
    koreanSpeaking: 4,
    otherLanguages: ["en"],
    skills: ["COMPUTER"],
    licenses: [],
    desiredIndustries: ["G"],
    desiredRegions: ["SEOUL"],
    needDormitory: false,
    shiftOk: "NO",
    desiredPayMin: 2_600_000,
    groupApply: false,
    verifiedKorean: false,
    experiences: [],
  },
  {
    // WO §15-8: BLIND_PROFILE revoked → hidden at once.
    referralCode: "SMPL0006",
    grade: "A",
    track: "JOB_MATCH",
    visaCode: "F-5",
    jobSearchStatus: "IMMEDIATE",
    blindProfile: "REVOKED",
    nationality: "CN",
    sido: "INCHEON",
    stayMonthsAhead: 60,
    entryYear: 2010,
    birthYear: 1985,
    gender: "MALE",
    major: "Logistics",
    majorField: "SERVICES",
    educationLevel: "COLLEGE",
    topikLevel: 6,
    kiipStage: 5,
    koreanSpeaking: 4,
    otherLanguages: ["zh"],
    skills: ["DRIVING"],
    licenses: ["KR_DRIVER_LICENSE"],
    desiredIndustries: ["H"],
    desiredRegions: ["INCHEON"],
    needDormitory: false,
    shiftOk: "YES",
    desiredPayMin: 3_500_000,
    groupApply: false,
    verifiedKorean: true,
    experiences: [{ country: "KR", industryCode: "H", role: "LOGISTICS", months: 60 }],
  },
  {
    // BR-06: not looking for work now (NOT_SEARCHING) → hidden.
    referralCode: "SMPL0007",
    grade: "A",
    track: "JOB_MATCH",
    visaCode: "F-2",
    visaSubType: "F-2-R",
    jobSearchStatus: "NOT_SEARCHING",
    blindProfile: "GIVEN",
    nationality: "MN",
    sido: "JEONNAM",
    stayMonthsAhead: 18,
    entryYear: 2020,
    birthYear: 1999,
    gender: "FEMALE",
    major: "Agriculture",
    majorField: "AGRICULTURE",
    educationLevel: "BACHELOR",
    topikLevel: 3,
    kiipStage: 2,
    koreanSpeaking: 3,
    otherLanguages: ["mn", "ru"],
    skills: ["COOKING"],
    licenses: [],
    desiredIndustries: ["A"],
    desiredRegions: ["JEONNAM"],
    needDormitory: true,
    shiftOk: "UNKNOWN",
    desiredPayMin: null,
    groupApply: false,
    verifiedKorean: false,
    experiences: [{ country: "MN", industryCode: "A", role: "AGRICULTURE", months: 36 }],
  },
];

function monthsAhead(now: Date, months: number): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + months, 1));
}

/** Inserts the sample seekers that are not there yet. Returns the number of rows present. */
export async function seedSampleSeekers(
  prisma: PrismaClient,
  now: Date = new Date(),
): Promise<number> {
  for (const s of SAMPLE_SEEKERS) {
    const exists = await prisma.seekerProfile.findUnique({
      where: { referralCode: s.referralCode },
      select: { id: true, majorField: true },
    });
    if (exists) {
      // P2b run 2 (Q-24): rows seeded before majorField existed get the code (sample rows only).
      if (exists.majorField === null) {
        await prisma.seekerProfile.update({
          where: { id: exists.id },
          data: { majorField: s.majorField },
        });
      }
      continue;
    }
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { role: "SEEKER", locale: "ko" } });
      await tx.seekerProfile.create({
        data: {
          userId: user.id,
          referralCode: s.referralCode,
          sourceChannel: SAMPLE_SEEKER_CHANNEL,
          referredByCode: s.groupFriendCode ?? null,
          nationality: s.nationality,
          sido: s.sido,
          visaCode: s.visaCode,
          visaSubType: s.visaSubType ?? null,
          stayExpiry: monthsAhead(now, s.stayMonthsAhead),
          entryYear: s.entryYear,
          hasArc: true,
          pendingApplication: "NO",
          visaConfirmedAt: now,
          birthYear: s.birthYear,
          gender: s.gender,
          educationLevel: s.educationLevel,
          majorField: s.majorField,
          major: s.major || null,
          graduationDate: monthsAhead(now, -60),
          topikLevel: s.topikLevel,
          kiipStage: s.kiipStage,
          koreanSpeaking: s.koreanSpeaking,
          otherLanguages: s.otherLanguages,
          skills: s.skills,
          licenses: s.licenses,
          desiredIndustries: s.desiredIndustries,
          desiredRegions: s.desiredRegions,
          needDormitory: s.needDormitory,
          shiftOk: s.shiftOk,
          desiredPayMin: s.desiredPayMin,
          availableFrom: s.jobSearchStatus === "IMMEDIATE" ? null : monthsAhead(now, 1),
          jobSearchStatus: s.jobSearchStatus,
          groupApply: s.groupApply,
          groupFriendCode: s.groupFriendCode ?? null,
          nextVisaGoal: "UNKNOWN",
          wantsConsult: true,
          consultTime: ["EVENING"],
          track: s.track,
          grade: s.grade,
          verifiedVisa: s.grade !== "B",
          verifiedKorean: s.verifiedKorean,
          consultedAt: s.grade !== "B" ? now : null,
          convertibleVisa: s.convertibleVisa ?? null,
          convertibleAt:
            s.convertibleMonthsAhead !== undefined
              ? monthsAhead(now, s.convertibleMonthsAhead)
              : null,
          status: "ACTIVE",
          completedStep: 7,
          experiences: { create: s.experiences },
        },
      });
      await tx.consent.createMany({
        data: ["PRIVACY_REQUIRED", "BLIND_PROFILE", "NOTICE"].map((type) => ({
          userId: user.id,
          type,
          version: "v1",
          locale: "ko",
          agreedAt: now,
          revokedAt: type === "BLIND_PROFILE" && s.blindProfile === "REVOKED" ? now : null,
        })),
      });
    });
  }
  return prisma.seekerProfile.count({ where: { sourceChannel: SAMPLE_SEEKER_CHANNEL } });
}
