"use client";

import { CalendarX, CircleCheck, CircleDashed, CircleX } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { answerInterviewConsent } from "@/server/actions/seeker/me";

export type InterviewConsentItem = {
  interviewId: string;
  /** Formatted on the server (next-intl formatter). */
  dateText: string;
  whereText: string;
  state: "PENDING" | "AGREED" | "DECLINED" | "ENDED";
  agreedAtText: string | null;
};

const STATE_ICON = {
  PENDING: CircleDashed,
  AGREED: CircleCheck,
  DECLINED: CircleX,
  ENDED: CalendarX,
} as const;
const STATE_VARIANT = {
  PENDING: "orange",
  AGREED: "blue",
  DECLINED: "neutral",
  ENDED: "neutral",
} as const;

/**
 * 면접 건별 이름 제공 동의 (R-211, PC-1). One row per confirmed interview: 동의 / 동의하지 않음, and
 * 동의 철회 with a confirmation dialog (STANDARD 3.1 dialog). The company sees only the real name of
 * an agreed interview — never contacts. The consent text is rendered on the server (`document`).
 * An ended interview (result recorded or cancelled, Q-25) shows "면접 종료" and no buttons.
 * A failed answer (including a server error) shows the retry message instead of an error page.
 */
export function InterviewConsents({
  items,
  document,
}: {
  items: InterviewConsentItem[];
  document: ReactNode;
}) {
  const t = useTranslations("seeker.me.interviewConsent");
  const te = useTranslations("errors.auth");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  // "auth": the session ended (UNAUTHENTICATED) → 다시 로그인 안내; "retry": anything else.
  const [error, setError] = useState<"auth" | "retry" | null>(null);

  const answer = (interviewId: string, action: "agree" | "decline" | "revoke") =>
    startTransition(async () => {
      setError(null);
      try {
        const r = await answerInterviewConsent({ interviewId, action, locale });
        if (r.ok) window.location.reload();
        else setError(r.code === "UNAUTHENTICATED" ? "auth" : "retry");
      } catch {
        // P2c QA F-1: a thrown server action must not replace the page with an error screen.
        setError("retry");
      }
    });

  return (
    <div className="grid gap-4" data-testid="interview-consents">
      <details className="rounded-md border border-n200 bg-n50 p-4 text-dense text-n700">
        <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-navy">
          {t("documentTitle")}
        </summary>
        <div className="mt-2">{document}</div>
      </details>
      <ul className="grid gap-3">
        {items.map((item) => {
          const Icon = STATE_ICON[item.state];
          const ended = item.state === "ENDED";
          return (
            <li
              key={item.interviewId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-n200 bg-white p-4"
              data-testid="interview-consent-item"
              data-interview-id={item.interviewId}
              data-state={item.state}
            >
              <div className="grid gap-1">
                <p className="text-body font-semibold text-navy">
                  {t("item", { date: item.dateText })}
                </p>
                <p className="text-dense text-n700">{item.whereText}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={STATE_VARIANT[item.state]}>
                    <Icon aria-hidden="true" strokeWidth={1.5} />
                    {t(`state.${item.state}`)}
                  </Badge>
                  {item.agreedAtText ? (
                    <span className="text-caption text-n500">
                      {t("agreedAt", { date: item.agreedAtText })}
                    </span>
                  ) : null}
                </div>
                {ended ? <p className="text-caption text-n500">{t("endedNote")}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {!ended && item.state !== "AGREED" ? (
                  <Button
                    variant="seeker"
                    size="sm"
                    disabled={pending}
                    onClick={() => answer(item.interviewId, "agree")}
                    data-testid="interview-consent-agree"
                  >
                    {t("agree")}
                  </Button>
                ) : null}
                {item.state === "PENDING" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => answer(item.interviewId, "decline")}
                    data-testid="interview-consent-decline"
                  >
                    {t("decline")}
                  </Button>
                ) : null}
                {item.state === "AGREED" ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" data-testid="interview-consent-revoke">
                        {t("revoke")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent closeLabel={t("close")}>
                      <DialogTitle>{t("confirmTitle")}</DialogTitle>
                      <DialogDescription>{t("confirmBody")}</DialogDescription>
                      <div className="flex flex-wrap justify-end gap-2">
                        <DialogClose asChild>
                          <Button variant="outline">{t("cancel")}</Button>
                        </DialogClose>
                        <Button
                          variant="destructive"
                          disabled={pending}
                          onClick={() => answer(item.interviewId, "revoke")}
                          data-testid="interview-consent-revoke-confirm"
                        >
                          {t("revokeConfirm")}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {error ? (
        <p role="alert" className="text-caption text-error-text">
          {error === "auth" ? te("unauthenticated") : t("error")}
        </p>
      ) : null}
    </div>
  );
}
