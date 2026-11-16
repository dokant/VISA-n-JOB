"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { type InterestActionState, requestInterestAction } from "@/server/actions/jobs/interest";

/**
 * 면접 신청 button for a signed-in seeker whose visa is in the posting's eligibleVisas (R-203).
 * The request goes to VISA n JOB staff (InterestRequest + StaffTask), never to the company (BR-01).
 * An expired session (UNAUTHENTICATED) goes to 간편 등록 with `?next=` back to this posting.
 */
export function InterestForm({
  postingId,
  registerHref,
}: {
  postingId: string;
  registerHref: string;
}) {
  const t = useTranslations("public.jobs.interest");
  const locale = useLocale();
  const [state, action, pending] = useActionState<InterestActionState, FormData>(
    requestInterestAction,
    null,
  );

  useEffect(() => {
    if (state && !state.ok && state.code === "UNAUTHENTICATED")
      window.location.assign(registerHref);
  }, [state, registerHref]);

  if (state?.ok) {
    return (
      <p
        role="status"
        className="rounded-sm border border-n200 bg-n50 px-3.5 py-3 text-dense text-navy"
        data-testid="interest-done"
      >
        {state.already ? t("already") : t("done")}
      </p>
    );
  }

  const errorKey =
    state && !state.ok
      ? state.code === "NOT_ELIGIBLE" || state.code === "BLOCKED"
        ? "blocked"
        : "error"
      : null;

  return (
    <form action={action} className="grid gap-3" data-testid="interest-form">
      <input type="hidden" name="postingId" value={postingId} />
      <input type="hidden" name="locale" value={locale} />
      <div>
        <Button type="submit" variant="seeker" disabled={pending} data-testid="interest-submit">
          {pending ? t("submitting") : t("button")}
        </Button>
      </div>
      {errorKey ? (
        <p role="alert" className="text-dense text-error-text" data-testid="interest-error">
          {t(errorKey)}
        </p>
      ) : null}
    </form>
  );
}
