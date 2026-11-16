"use client";

import { ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";

import { CONSULT_HREF } from "@/components/common/coming-soon";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { type InterestActionState, requestInterestAction } from "@/server/actions/jobs/interest";

/**
 * 면접 신청 button for a signed-in seeker whose visa is in the posting's eligibleVisas (R-203).
 * The request goes to VISA n JOB staff (InterestRequest + StaffTask), never to the company (BR-01).
 * An expired session (UNAUTHENTICATED) goes to 간편 등록 with `?next=` back to this posting.
 * P2a QA O-2: when the server answers NOT_ELIGIBLE / BLOCKED (the visa or status changed after the
 * page was opened) the form is replaced by the same notice and 상담 신청 button as the panel's
 * 비자 부적합 · BLOCKED states, without the "신청하면 … 연락드립니다" line.
 */
export function InterestForm({
  postingId,
  registerHref,
  consultLabel,
}: {
  postingId: string;
  registerHref: string;
  consultLabel: string;
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

  const how = (
    <p className="text-caption text-n500" data-testid="interest-how">
      {t("how")}
    </p>
  );

  if (state?.ok) {
    return (
      <>
        <p
          role="status"
          className="rounded-sm border border-n200 bg-n50 px-3.5 py-3 text-dense text-navy"
          data-testid="interest-done"
        >
          {state.already ? t("already") : t("done")}
        </p>
        {how}
      </>
    );
  }

  if (state && !state.ok && (state.code === "NOT_ELIGIBLE" || state.code === "BLOCKED")) {
    const blocked = state.code === "BLOCKED";
    return (
      <>
        <div
          role="alert"
          className="grid gap-1.5"
          data-testid="interest-not-eligible"
          data-code={state.code}
        >
          <p className="text-dense font-semibold text-navy">
            {blocked ? t("blocked") : t("notEligibleTitle")}
          </p>
          {blocked ? null : <p className="text-dense text-n700">{t("notEligibleBody")}</p>}
        </div>
        <div>
          <Button asChild>
            <Link href={CONSULT_HREF} data-testid="interest-consult">
              {consultLabel}
              <ArrowRight aria-hidden="true" strokeWidth={1.5} data-icon="trailing" />
            </Link>
          </Button>
        </div>
      </>
    );
  }

  const failed = Boolean(state && !state.ok);

  return (
    <>
      <form action={action} className="grid gap-3" data-testid="interest-form">
        <input type="hidden" name="postingId" value={postingId} />
        <input type="hidden" name="locale" value={locale} />
        <div>
          <Button type="submit" variant="seeker" disabled={pending} data-testid="interest-submit">
            {pending ? t("submitting") : t("button")}
          </Button>
        </div>
        {failed ? (
          <p role="alert" className="text-dense text-error-text" data-testid="interest-error">
            {t("error")}
          </p>
        ) : null}
      </form>
      {how}
    </>
  );
}
