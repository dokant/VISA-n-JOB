"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useId } from "react";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { type VisaCheckState, evaluateVisaAction } from "@/server/actions/visa/evaluateVisa";

import { OutcomeCard } from "./outcome-card";

export type LabeledOption = { code: string; label: string };
export type VisaBoxOption = { code: string; nameKey: string; label: string };

type Props = {
  /** "boxes" = home widget visa boxes [HO `.vbox`], "select" = full list on /visa-check. */
  visaInput: "boxes" | "select";
  visas: VisaBoxOption[];
  sidos: LabeledOption[];
  industries: LabeledOption[];
  defaults?: { visaCode?: string; sido?: string; industryCode?: string };
  /** Result already computed on the server (e.g. /visa-check?visaCode=…). */
  initialState?: VisaCheckState;
  className?: string;
};

/**
 * Visa check form (R-126) used by the home widget (STANDARD 3.7 #10) and /visa-check. The result is
 * computed only on the server by evaluate.ts and shown with OutcomeCard (reference disclaimer
 * always). The form works without JavaScript (server action progressive enhancement).
 */
export function VisaCheckForm({
  visaInput,
  visas,
  sidos,
  industries,
  defaults,
  initialState,
  className,
}: Props) {
  const t = useTranslations("visa.form");
  const id = useId();
  const [state, formAction, pending] = useActionState(
    evaluateVisaAction,
    initialState ?? ({ status: "idle" } as VisaCheckState),
  );
  const defaultVisa = defaults?.visaCode ?? visas[0]?.code;

  return (
    <div className={cn("grid gap-4", className)}>
      <form action={formAction} className="grid gap-4" data-testid="visa-check-form">
        {visaInput === "boxes" ? (
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-label text-n700">{t("visa")}</legend>
            <div className="grid grid-cols-2 gap-1.5 xs:grid-cols-3 md:grid-cols-5">
              {visas.map((v) => (
                <label key={v.code} className="group relative block cursor-pointer">
                  <input
                    type="radio"
                    name="visaCode"
                    value={v.code}
                    defaultChecked={v.code === defaultVisa}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      "grid min-h-13.5 place-items-center content-center rounded-sm border border-input bg-white px-1.5 py-1.5 text-center text-meta font-bold text-n700",
                      "transition-[background-color,color,border-color,box-shadow] duration-250 ease-standard group-hover:border-n500 group-hover:text-navy",
                      "peer-checked:border-navy peer-checked:bg-navy peer-checked:text-white peer-checked:shadow-ink",
                      "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-ring",
                    )}
                  >
                    <span>{v.code}</span>
                    <span className="block text-eyebrow font-medium tracking-normal opacity-80">
                      {v.label}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <div className="grid gap-1.75">
            <label htmlFor={`${id}-visa`} className="text-label text-n700">
              {t("visa")}
            </label>
            <NativeSelect id={`${id}-visa`} name="visaCode" defaultValue={defaultVisa} required>
              {visas.map((v) => (
                <option key={v.code} value={v.code}>
                  {v.code} {v.label}
                </option>
              ))}
            </NativeSelect>
          </div>
        )}

        <div className="grid gap-2.5 md:grid-cols-2">
          <div className="grid gap-1.75">
            <label htmlFor={`${id}-sido`} className="text-label text-n700">
              {t("sido")} <span className="font-normal text-n500">({t("optional")})</span>
            </label>
            <NativeSelect id={`${id}-sido`} name="sido" defaultValue={defaults?.sido ?? ""}>
              <option value="">{t("any")}</option>
              {sidos.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-1.75">
            <label htmlFor={`${id}-industry`} className="text-label text-n700">
              {t("industry")} <span className="font-normal text-n500">({t("optional")})</span>
            </label>
            <NativeSelect
              id={`${id}-industry`}
              name="industryCode"
              defaultValue={defaults?.industryCode ?? ""}
            >
              <option value="">{t("any")}</option>
              {industries.map((i) => (
                <option key={i.code} value={i.code}>
                  {i.label}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        <Button type="submit" className="h-14 w-full text-ui" disabled={pending}>
          <Search aria-hidden="true" strokeWidth={1.5} />
          {pending ? t("pending") : t("submit")}
        </Button>
      </form>

      <div aria-live="polite" data-testid="visa-check-result">
        {state.status === "ok" ? (
          <OutcomeCard outcome={state.outcome} visa={state.visa} messageKey={state.messageKey} />
        ) : null}
        {state.status === "invalid" ? (
          <p role="alert" className="text-caption text-error-text">
            {t("invalid")}
          </p>
        ) : null}
        {state.status === "error" ? (
          <p role="alert" className="text-caption text-error-text">
            {t("error")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
