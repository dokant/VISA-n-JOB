"use client";

import { CircleCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  type StillSearchingActionState,
  answerStillSearching,
} from "@/server/actions/seeker/stillSearching";

import { StillSearchingNotice } from "./still-searching-notice";

/**
 * "네, 아직 찾고 있습니다" (R-213 원클릭 응답). One button; the signed token is a hidden field. After the
 * answer the result replaces the form (done / answered / expired), errors stay next to the button.
 */
export function StillSearchingForm({ token }: { token: string }) {
  const t = useTranslations("seeker.stillSearching");
  const [state, action, pending] = useActionState<StillSearchingActionState, FormData>(
    answerStillSearching,
    null,
  );
  if (state?.ok) {
    return <StillSearchingNotice kind="done" title={t("done.title")} body={t("done.body")} />;
  }
  if (state && !state.ok && state.state !== "ERROR") {
    const key =
      state.state === "ANSWERED" ? "answered" : state.state === "EXPIRED" ? "expired" : "invalid";
    return (
      <StillSearchingNotice
        kind={key}
        title={t(`${key}.title`)}
        body={t(`${key}.body`)}
        consultLabel={key === "answered" ? undefined : t("consult")}
      />
    );
  }
  return (
    <form action={action} className="grid gap-4" data-testid="still-searching-form">
      <input type="hidden" name="token" value={token} />
      <div>
        <Button type="submit" variant="seeker" disabled={pending} data-testid="still-searching-yes">
          <CircleCheck aria-hidden="true" strokeWidth={1.5} />
          {pending ? t("confirming") : t("confirm")}
        </Button>
      </div>
      <p className="text-caption text-n500">{t("note")}</p>
      {state && !state.ok ? (
        <p role="alert" className="text-caption text-error-text">
          {t("error")}
        </p>
      ) : null}
    </form>
  );
}
