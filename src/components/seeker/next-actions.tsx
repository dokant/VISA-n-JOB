import type { SeekerTrack } from "@prisma/client";
import { ArrowRight, Bell, Calculator, Briefcase, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { CONSULT_HREF } from "@/components/common/coming-soon";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/** Which guidance sentence fits (WO §7.4 "등록 후 안내"). Track codes are never shown (STANDARD 1.1). */
export type TrackGuide =
  "JOB_MATCH" | "JOB_MATCH_CONSULT" | "VISA_REVIEW" | "CONSULT_ONLY" | "FUTURE_POOL";

export function trackGuide(
  track: SeekerTrack | null,
  flags: { autoConsult: boolean; needsVisaReview: boolean },
): TrackGuide {
  if (track === "JOB_MATCH") {
    if (flags.needsVisaReview) return "VISA_REVIEW";
    return flags.autoConsult ? "JOB_MATCH_CONSULT" : "JOB_MATCH";
  }
  return track === "FUTURE_POOL" ? "FUTURE_POOL" : "CONSULT_ONLY";
}

/**
 * Track-specific next actions (R-112, WO §7.3 완료 화면): 추천 일자리 보기 / 상담 신청 /
 * 체류 만료 알림 설정, plus the E-7-4 calculator for FUTURE_POOL (WO §7.4).
 */
export function NextActions({ guide }: { guide: TrackGuide }) {
  const t = useTranslations("seeker.next");
  const jobMatch =
    guide === "JOB_MATCH" || guide === "JOB_MATCH_CONSULT" || guide === "VISA_REVIEW";
  return (
    <section className="grid gap-4" data-testid="next-actions" data-guide={guide}>
      <p className="text-body text-n700" data-testid="track-guide">
        {t(`guide.${guide}`)}
      </p>
      <div className="flex flex-wrap gap-2">
        {jobMatch ? (
          <Button asChild variant="seeker">
            <Link href="/seeker/me/recommended" data-testid="action-recommended">
              <Briefcase aria-hidden="true" strokeWidth={1.5} />
              {t("recommended")}
              <ArrowRight aria-hidden="true" strokeWidth={1.5} />
            </Link>
          </Button>
        ) : null}
        {!jobMatch || guide !== "JOB_MATCH" ? (
          <Button asChild variant={jobMatch ? "outline" : "seeker"}>
            <Link href={CONSULT_HREF} data-testid="action-consult">
              <MessageCircle aria-hidden="true" strokeWidth={1.5} />
              {t("consult")}
            </Link>
          </Button>
        ) : null}
        {guide === "FUTURE_POOL" ? (
          <Button asChild variant="outline">
            <Link href="/score/e74" data-testid="action-score">
              <Calculator aria-hidden="true" strokeWidth={1.5} />
              {t("score")}
            </Link>
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link href="/seeker/me/stay" data-testid="action-stay">
            <Bell aria-hidden="true" strokeWidth={1.5} />
            {t("stay")}
          </Link>
        </Button>
      </div>
    </section>
  );
}
