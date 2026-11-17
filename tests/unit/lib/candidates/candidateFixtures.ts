/**
 * P2b fixtures: employer-visible seekers and companies in the shared test DB (never cleaned).
 *
 * Each test tags its seekers with a unique `convertibleVisa` code and filters the candidate list by
 * that code (WO §9.3 filter "전환 가능 비자"), so rows written by other test files never change what
 * a test sees. Seekers carry personal data in every field that must never reach an employer
 * (encrypted name / e-mail / messenger, phone on the account, free-text major, school, company name
 * of the experience), so leak checks have something to find.
 */
import { randomInt } from "node:crypto";

import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { phoneHashOf } from "@/lib/otp";

import { uniq } from "../../db/helpers";

export const LEAK_NAME = "NGUYEN LEAKTEST";
export const LEAK_EMAIL = "leak.seeker@example.test";
export const LEAK_MESSENGER = "leaky_zalo_id";
export const LEAK_MAJOR = "Major free text call 010-9876-5432";
export const LEAK_EMPLOYER = "Leak Employer Co";

/** A code-shaped tag (filter value) unique to one test. */
export function tag(prefix = "T"): string {
  return uniq(prefix)
    .replace(/[^A-Za-z0-9_-]/g, "-")
    .slice(0, 40);
}

function months(n: number, now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + n, 1));
}

let refSeq = 0;
function referralCode(): string {
  refSeq += 1;
  return `C${Date.now().toString(36).toUpperCase()}${process.pid}${refSeq}${randomInt(1e6)}`.slice(
    0,
    30,
  );
}

export type SeekerOver = Partial<Prisma.SeekerProfileUncheckedCreateInput> & {
  blindProfile?: "GIVEN" | "REVOKED" | "NONE";
};

/** An employer-visible seeker (grade A, JOB_MATCH, ACTIVE, finished, BLIND_PROFILE given). */
export async function candidate(convertibleTag: string, over: SeekerOver = {}) {
  const { blindProfile = "GIVEN", ...data } = over;
  const phone = `+8210${randomInt(10_000_000, 99_999_999)}`;
  const user = await db.user.create({
    data: { role: "SEEKER", phoneEnc: phone, phoneHash: phoneHashOf(phone) },
  });
  const industry = await db.industry.findFirstOrThrow({ select: { code: true } });
  const profile = await db.seekerProfile.create({
    data: {
      userId: user.id,
      referralCode: referralCode(),
      legalNameEnc: LEAK_NAME,
      emailEnc: LEAK_EMAIL,
      messengerType: "ZALO",
      messengerIdEnc: LEAK_MESSENGER,
      schoolNameEnc: "Leak University",
      major: LEAK_MAJOR,
      birthYear: 1995,
      gender: "MALE",
      nationality: "VN",
      sido: "SEOUL",
      visaCode: "F-4",
      stayExpiry: months(18),
      entryYear: 2020,
      hasArc: true,
      educationLevel: "BACHELOR",
      graduationDate: months(-24),
      topikLevel: 3,
      kiipStage: 2,
      koreanSpeaking: 3,
      otherLanguages: ["en"],
      skills: ["WELDING"],
      licenses: ["WELDING_CERT"],
      desiredIndustries: [industry.code],
      desiredRegions: ["SEOUL"],
      needDormitory: true,
      shiftOk: "YES",
      desiredPayMin: 2_600_000,
      jobSearchStatus: "IMMEDIATE",
      track: "JOB_MATCH",
      grade: "A",
      verifiedVisa: true,
      consultedAt: new Date(),
      convertibleVisa: convertibleTag,
      status: "ACTIVE",
      completedStep: 7,
      ...data,
      experiences: {
        create: [
          {
            country: "KR",
            industryCode: industry.code,
            role: "WELDING",
            months: 24,
            employerNameEnc: LEAK_EMPLOYER,
          },
        ],
      },
    },
    select: { id: true, publicId: true, userId: true, referralCode: true },
  });
  if (blindProfile !== "NONE") {
    await db.consent.create({
      data: {
        userId: user.id,
        type: "BLIND_PROFILE",
        version: "v1",
        locale: "ko",
        revokedAt: blindProfile === "REVOKED" ? new Date() : null,
      },
    });
  }
  return profile;
}

/** An EMPLOYER account and its company (verified / contract as asked). */
export async function company(opts: { verified?: boolean; contracted?: boolean } = {}) {
  const industry = await db.industry.findFirstOrThrow({ select: { code: true } });
  const user = await db.user.create({
    data: {
      role: "EMPLOYER",
      email: `${uniq("cand-employer")}@example.test`,
      company: {
        create: {
          nameEnc: "후보 테스트 기업",
          industryCode: industry.code,
          sido: "SEOUL",
          verified: opts.verified ?? false,
          verifiedAt: opts.verified ? new Date() : null,
          contractSignedAt: opts.contracted ? new Date() : null,
          contractVersion: opts.contracted ? "v1" : null,
        },
      },
    },
    select: { id: true, companyId: true },
  });
  return { id: user.id, companyId: user.companyId as string };
}
