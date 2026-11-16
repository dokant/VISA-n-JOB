/**
 * The signed-in seeker's own summary for the completion screen and 마이페이지 (R-112, R-113).
 * Own data only; nothing here is for employers.
 */
import type { SeekerGrade, SeekerTrack } from "@prisma/client";

import { getSiteConfig } from "@/config/site.config";
import { db } from "@/lib/db";

import { ensureSeekerProfile } from "./account";
import { WIZARD_LAST_STEP } from "./options";
import { referralSharePath } from "./referral";
import { classifyProfile } from "./saveStep";

export type SeekerOverview = {
  grade: SeekerGrade;
  track: SeekerTrack | null;
  completedStep: number;
  completed: boolean;
  isQuickSignup: boolean;
  referralCode: string;
  referralCount: number;
  shareUrl: string;
  visa: { code: string; nameKey: string } | null;
  stayExpiry: Date | null;
  stayAlertOptIn: boolean;
  autoConsult: boolean;
  needsVisaReview: boolean;
};

export async function getSeekerOverview(
  userId: string,
  locale: string,
  now: Date = new Date(),
): Promise<SeekerOverview> {
  await ensureSeekerProfile(userId);
  const p = await db.seekerProfile.findUniqueOrThrow({
    where: { userId },
    select: {
      grade: true,
      track: true,
      completedStep: true,
      isQuickSignup: true,
      referralCode: true,
      visaCode: true,
      stayExpiry: true,
      graduationDate: true,
      stayAlertOptIn: true,
      needsVisaReview: true,
    },
  });
  const [referralCount, visaType, track] = await Promise.all([
    db.seekerProfile.count({ where: { referredByCode: p.referralCode } }),
    p.visaCode
      ? db.visaType.findUnique({
          where: { code: p.visaCode },
          select: { code: true, nameKey: true },
        })
      : null,
    p.visaCode ? classifyProfile(p, now) : null,
  ]);
  return {
    grade: p.grade,
    track: p.track,
    completedStep: p.completedStep,
    completed: p.completedStep >= WIZARD_LAST_STEP,
    isQuickSignup: p.isQuickSignup,
    referralCode: p.referralCode,
    referralCount,
    shareUrl: `${getSiteConfig().siteUrl}/${locale}${referralSharePath(p.referralCode)}`,
    visa: visaType,
    stayExpiry: p.stayExpiry,
    stayAlertOptIn: p.stayAlertOptIn,
    autoConsult: track?.registrable === true && track.autoConsult,
    needsVisaReview: p.needsVisaReview,
  };
}
