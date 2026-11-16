"use client";

import { Calculator } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useId } from "react";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { type ScoreState, scoreE74Action } from "@/server/actions/score/scoreE74";

import { ScoreResult } from "./score-result";

export type ScoreFormItem = {
  key: string;
  label: string;
  bands: Array<{ key: string; label: string }>;
};

type Props = { items: ScoreFormItem[] };

/**
 * E-7-4 calculator form (R-127). Items and bands come from the PUBLISHED score table (labels are
 * localized on the server); the score is computed only on the server by e74.ts.
 */
export function ScoreForm({ items }: Props) {
  const t = useTranslations("score.form");
  const id = useId();
  const [state, formAction, pending] = useActionState(scoreE74Action, {
    status: "idle",
  } as ScoreState);

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
      <form action={formAction} className="grid gap-5.5" data-testid="score-form">
        {items.map((item, index) => (
          <div key={item.key} className="grid gap-1.75">
            <label htmlFor={`${id}-${index}`} className="text-label text-n700">
              {item.label}
            </label>
            <NativeSelect id={`${id}-${index}`} name={`item.${item.key}`} defaultValue="">
              <option value="">{t("choose")}</option>
              {item.bands.map((band) => (
                <option key={band.key} value={band.key}>
                  {band.label}
                </option>
              ))}
            </NativeSelect>
          </div>
        ))}
        <Button type="submit" className="w-full" disabled={pending}>
          <Calculator aria-hidden="true" strokeWidth={1.5} />
          {pending ? t("pending") : t("submit")}
        </Button>
      </form>
      <div aria-live="polite">
        {state.status === "ok" ? <ScoreResult result={state.result} /> : null}
      </div>
    </div>
  );
}
