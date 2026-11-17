"use client";

import { Check, Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  type CandidateInterviewState,
  requestCandidateInterviewAction,
} from "@/server/actions/employer/candidates";

const ERROR_KEY: Record<string, string> = {
  NOT_FOUND: "notFound",
  INVALID: "notFound",
  NOT_CONTRACTED: "notContracted",
  UNAUTHENTICATED: "unauthenticated",
  FORBIDDEN: "unauthenticated",
};

/**
 * "면접 요청" (R-207, WO §9.3): the only action on a candidate card. It goes to VISA n JOB
 * (InterestRequest EMPLOYER + staff task), never to the seeker (BR-01). No "지원하기" (SC-06).
 */
export function InterviewRequestButton({
  publicId,
  requested,
}: {
  publicId: string;
  /** This company already asked for this candidate. */
  requested: boolean;
}) {
  const t = useTranslations("employer.candidates.interview");
  const locale = useLocale();
  const [state, action, pending] = useActionState<CandidateInterviewState, FormData>(
    requestCandidateInterviewAction,
    null,
  );
  const done = requested || state?.ok === true;

  if (done) {
    return (
      <div className="grid justify-items-start gap-2" data-testid="interview-requested">
        <span className="inline-flex min-h-11 items-center gap-2 text-dense font-semibold text-navy">
          <Check aria-hidden="true" strokeWidth={2} className="size-4" />
          {t("requested")}
        </span>
        <p role="status" className="text-caption text-n700">
          {state?.ok ? (state.already ? t("already") : t("done")) : t("already")}
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="grid justify-items-start gap-2" data-testid="interview-form">
      <input type="hidden" name="publicId" value={publicId} />
      <input type="hidden" name="locale" value={locale} />
      <Button type="submit" disabled={pending} data-testid="interview-request">
        <Send aria-hidden="true" strokeWidth={1.5} />
        {pending ? t("pending") : t("cta")}
      </Button>
      {state && !state.ok ? (
        <p role="alert" className="text-caption text-error-text" data-code={state.code}>
          {t(`error.${ERROR_KEY[state.code] ?? "unknown"}`)}
        </p>
      ) : null}
    </form>
  );
}
