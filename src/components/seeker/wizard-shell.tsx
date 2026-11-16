"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useState, useTransition } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

import { codeToKey } from "@/components/forms/error-key";
import { BlockedNotice } from "@/components/seeker/blocked-notice";
import { Button } from "@/components/ui/button";
import { OTP_CODE_LENGTH, DESIRED_MAX_SELECTIONS, PASSWORD_MIN_LENGTH } from "@/config/limits";
import { Link } from "@/i18n/navigation";
import { type RegisterActionState, saveRegistrationStep } from "@/server/actions/seeker/register";

/** ICU arguments every `errors.field.*` text may use (STANDARD S-53: numbers come from limits). */
export const FIELD_ERROR_ARGS = {
  length: OTP_CODE_LENGTH,
  max: DESIRED_MAX_SELECTIONS,
  min: PASSWORD_MIN_LENGTH,
} as const;

/** `errors.field.{code}` text for a zod / server error code. */
export function useFieldError() {
  const te = useTranslations("errors.field");
  return (code: string | undefined) => {
    if (!code) return undefined;
    // zod messages are already lowerCamelCase keys; server codes may be UPPER_SNAKE.
    const key = /[A-Z_]/.test(code) && code === code.toUpperCase() ? codeToKey(code) : code;
    return te.has(key) ? te(key, FIELD_ERROR_ARGS) : te("invalidValue");
  };
}

/** Server error text (`errors.auth.*` / `errors.register.*`). */
export function useServerErrorText() {
  const te = useTranslations("errors");
  return (code: string, retryAfterSec?: number) => {
    const key = codeToKey(code);
    for (const group of ["register", "auth"]) {
      if (te.has(`${group}.${key}`)) return te(`${group}.${key}`, { seconds: retryAfterSec ?? 0 });
    }
    return te("auth.unknown");
  };
}

/**
 * Submits one wizard screen to the server (auto save, R-107) and navigates to the next one with a
 * full page load (fresh server data). Server field errors are put back on the form fields.
 */
export function useStepSubmit<T extends FieldValues>(step: string, form: UseFormReturn<T>) {
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<RegisterActionState | null>(null);

  const submit = (values: T) =>
    startTransition(async () => {
      setState(null);
      const r = await saveRegistrationStep({ step, locale, values });
      if (r.ok) {
        window.location.assign(r.redirectTo);
        return;
      }
      if (r.fieldErrors) {
        // STANDARD 3.3: focus moves to the first field with an error.
        Object.entries(r.fieldErrors).forEach(([field, code], i) => {
          form.setError(
            field as Path<T>,
            { type: "server", message: code },
            { shouldFocus: i === 0 },
          );
        });
      }
      setState(r);
    });

  return { submit: form.handleSubmit(submit), pending, state };
}

/**
 * Bottom area of a wizard screen: summary / server error / blocked notice in the normal flow, then
 * "이전 / 다음" in a sticky bottom bar (STANDARD 3.3 하단 고정, Q-10). Rendered as direct children of
 * the step <form> so the bar sticks over the whole form height.
 */
export function WizardNav({
  backHref,
  pending,
  disabled = false,
  state,
  submitLabel,
  children,
}: {
  backHref?: string;
  pending: boolean;
  /** Next is unavailable for another reason (e.g. 등록 불가 비자): disabled, label unchanged. */
  disabled?: boolean;
  state: RegisterActionState | null;
  submitLabel?: string;
  children?: ReactNode;
}) {
  const t = useTranslations("seeker.register.common");
  const serverText = useServerErrorText();
  const failed = state && !state.ok ? state : null;
  return (
    <>
      {children}
      {failed?.code === "BLOCKED" ? <BlockedNotice reason={failed.reason} /> : null}
      {failed && failed.code !== "BLOCKED" && failed.code !== "VALIDATION" ? (
        <p role="alert" className="text-caption text-error-text" data-testid="wizard-error">
          {serverText(failed.code, failed.retryAfterSec)}
        </p>
      ) : null}
      {failed?.code === "VALIDATION" ? (
        <p role="alert" className="text-caption text-error-text" data-testid="wizard-error">
          {t("fixErrors")}
        </p>
      ) : null}
      <div
        className="sticky bottom-0 z-20 -mx-gutter flex items-center justify-between gap-3 border-t border-navy/8 bg-white/82 px-gutter py-3 backdrop-blur-nav backdrop-saturate-160"
        data-testid="wizard-nav-bar"
        data-sticky-bottom-bar=""
      >
        {backHref ? (
          <Button asChild variant="outline">
            <Link href={backHref} data-testid="wizard-back">
              <ArrowLeft aria-hidden="true" strokeWidth={1.5} />
              {t("back")}
            </Link>
          </Button>
        ) : (
          <span />
        )}
        <Button
          type="submit"
          variant="seeker"
          disabled={pending || disabled}
          data-testid="wizard-next"
        >
          {pending ? t("saving") : (submitLabel ?? t("next"))}
          <ArrowRight aria-hidden="true" strokeWidth={1.5} />
        </Button>
      </div>
    </>
  );
}
