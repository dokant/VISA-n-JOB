import { ArrowRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { CONSULT_HREF } from "@/components/common/coming-soon";
import { ScopedIntlProvider } from "@/components/common/scoped-intl-provider";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { InterestState } from "@/lib/postings/interest";

import { InterestForm } from "./interest-form";

type Props = {
  postingId: string;
  /** null = no signed-in seeker (visitor, or another account type). */
  state: InterestState | null;
};

/**
 * 면접 신청 area of a posting (R-203, WO §8.5):
 * - no seeker session → "면접 신청" goes to 간편 등록 with `?next=` back to this posting (and a login
 *   link with the same `next`);
 * - visa not in eligibleVisas (or blocked) → "상담 신청" instead of 면접 신청;
 * - eligible → the 면접 신청 form; already requested → a received message.
 * The states where a request can be made (or was made) say that it goes to VISA n JOB staff, not to
 * the company (BR-01). The 비자 부적합 · BLOCKED states show only their own notice and 상담 신청 (the
 * "신청하면 … 연락드립니다" line does not fit a request that cannot be made).
 * The words "지원하기" / "Apply" are never used (SC-06).
 */
export async function InterestPanel({ postingId, state }: Props) {
  const t = await getTranslations("public.jobs.interest");
  const locale = await getLocale();
  const next = `/jobs/${postingId}`;
  const registerPath = `/seeker/register/quick?next=${encodeURIComponent(next)}`;
  const loginPath = `/seeker/login?next=${encodeURIComponent(next)}`;
  const panelState = state ?? "ANONYMOUS";
  const consultLabel = (await getTranslations("common"))("consult");

  return (
    <section
      aria-labelledby="interest-title"
      data-testid="interest-panel"
      data-state={panelState}
      className="grid content-start gap-4 rounded-md border border-border bg-white p-6 shadow-1"
    >
      <h2 id="interest-title" className="text-h3 text-navy">
        {t("title")}
      </h2>

      {state === null ? (
        <>
          <p className="text-dense text-n700">{t("anonymous")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="seeker">
              <Link href={registerPath} data-testid="interest-register">
                {t("button")}
                <ArrowRight aria-hidden="true" strokeWidth={1.5} data-icon="trailing" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={loginPath} data-testid="interest-login">
                {t("login")}
              </Link>
            </Button>
          </div>
        </>
      ) : state === "NOT_ELIGIBLE" || state === "BLOCKED" ? (
        <>
          <div className="grid gap-1.5" data-testid="interest-not-eligible">
            <p className="text-dense font-semibold text-navy">
              {state === "BLOCKED" ? t("blocked") : t("notEligibleTitle")}
            </p>
            {state === "NOT_ELIGIBLE" ? (
              <p className="text-dense text-n700">{t("notEligibleBody")}</p>
            ) : null}
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
      ) : state === "REQUESTED" ? (
        <p
          role="status"
          className="rounded-sm border border-n200 bg-n50 px-3.5 py-3 text-dense text-navy"
          data-testid="interest-done"
        >
          {t("already")}
        </p>
      ) : (
        <ScopedIntlProvider namespaces={["public.jobs.interest"]}>
          <InterestForm
            postingId={postingId}
            registerHref={`/${locale}${registerPath}`}
            consultLabel={consultLabel}
          />
        </ScopedIntlProvider>
      )}

      {state === null || state === "REQUESTED" ? (
        <p className="text-caption text-n500" data-testid="interest-how">
          {t("how")}
        </p>
      ) : null}
    </section>
  );
}
