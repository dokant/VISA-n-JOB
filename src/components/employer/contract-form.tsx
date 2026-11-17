"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Locale } from "@/i18n/locales";
import { type ContractState, signContractAction } from "@/server/actions/employer/contract";

const ERROR_KEY: Record<string, string> = {
  TERMS_REQUIRED: "termsRequired",
  ALREADY_SIGNED: "alreadySigned",
  UNAUTHENTICATED: "unauthenticated",
  FORBIDDEN: "unauthenticated",
};

/**
 * 계약 동의 (R-208, WO §9.4): the terms box (required) and the 체류 업무 위임 box (optional, separate
 * — leaving it empty still completes the contract). On a missing terms box the error is shown under
 * it and focus moves there (STANDARD 3.3).
 */
export function ContractForm() {
  const t = useTranslations("employer.contract");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const id = useId();
  const termsRef = useRef<HTMLButtonElement>(null);
  const [terms, setTerms] = useState(false);
  const [mandate, setMandate] = useState(false);
  const [state, setState] = useState<ContractState>(null);
  const [pending, startTransition] = useTransition();
  const termsError = state && !state.ok && state.code === "TERMS_REQUIRED";

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!terms) {
      setState({ ok: false, code: "TERMS_REQUIRED" });
      termsRef.current?.focus();
      return;
    }
    startTransition(async () => {
      const r = await signContractAction({ termsAgreed: terms, visaMandate: mandate, locale });
      setState(r);
      if (r?.ok) router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5" data-testid="contract-form">
      <div className="grid gap-1.5">
        <label
          htmlFor={`${id}-terms`}
          className="flex min-h-11 cursor-pointer items-start gap-3 py-2.5 text-dense text-navy"
        >
          <Checkbox
            id={`${id}-terms`}
            ref={termsRef}
            checked={terms}
            onCheckedChange={(v) => setTerms(v === true)}
            aria-invalid={termsError ? true : undefined}
            aria-describedby={termsError ? `${id}-terms-error` : undefined}
            className="mt-0.5"
            data-testid="contract-terms"
          />
          <span>
            {t("terms.label")} <span className="text-n500">{t("terms.required")}</span>
          </span>
        </label>
        {termsError ? (
          <p id={`${id}-terms-error`} role="alert" className="text-caption text-error-text">
            {t("error.termsRequired")}
          </p>
        ) : null}
      </div>

      <div className="grid gap-1.5 rounded-sm border border-n200 bg-n50 px-3.5 py-2">
        <label
          htmlFor={`${id}-mandate`}
          className="flex min-h-11 cursor-pointer items-start gap-3 py-2.5 text-dense text-navy"
        >
          <Checkbox
            id={`${id}-mandate`}
            checked={mandate}
            onCheckedChange={(v) => setMandate(v === true)}
            aria-describedby={`${id}-mandate-help`}
            className="mt-0.5"
            data-testid="contract-mandate"
          />
          <span>
            {t("mandate.label")} <span className="text-n500">{t("mandate.optional")}</span>
          </span>
        </label>
        <p id={`${id}-mandate-help`} className="ps-8 pb-1 text-caption text-n700">
          {t("mandate.help")}
        </p>
      </div>

      <div className="grid justify-items-start gap-2">
        <Button type="submit" disabled={pending} data-testid="contract-submit">
          {pending ? t("submitting") : t("submit")}
        </Button>
        {state && !state.ok && !termsError ? (
          <p role="alert" className="text-caption text-error-text" data-code={state.code}>
            {t(`error.${ERROR_KEY[state.code] ?? "unknown"}`)}
          </p>
        ) : null}
      </div>
    </form>
  );
}
