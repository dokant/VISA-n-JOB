"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { DisclosureIcon, DisclosureSummary } from "@/components/forms/disclosure-badge";
import { FormField } from "@/components/forms/form-field";
import { PhoneOtpFields } from "@/components/seeker/phone-otp-fields";
import { useFieldError, useServerErrorText } from "@/components/seeker/wizard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { type Locale, localeNames, locales } from "@/i18n/locales";
import { type Step0Input, step0Schema } from "@/schemas/seeker/register/step0";
import { type RegisterActionState, startRegistration } from "@/server/actions/seeker/register";

/** Wizard Step 0 시작 (WO §7.3): 사용 언어, 휴대폰 + OTP, 추천 코드 → account + sign-in. */
export function WizardStartForm({ referralCode }: { referralCode: string }) {
  const t = useTranslations("seeker.register.step0");
  const locale = useLocale() as Locale;
  const fieldError = useFieldError();
  const serverText = useServerErrorText();
  const id = useId();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<RegisterActionState | null>(null);
  const form = useForm<Step0Input>({
    resolver: zodResolver(step0Schema),
    defaultValues: { locale, phone: "", code: "", referralCode },
  });

  const submit = form.handleSubmit((values) =>
    startTransition(async () => {
      setState(null);
      const r = await startRegistration(values);
      if (r.ok) {
        window.location.assign(r.redirectTo);
        return;
      }
      for (const [field, code] of Object.entries(r.fieldErrors ?? {})) {
        form.setError(field as keyof Step0Input, { type: "server", message: code });
      }
      setState(r);
    }),
  );
  const failed = state && !state.ok && state.code !== "VALIDATION" ? state : null;

  return (
    <form noValidate onSubmit={submit} className="grid gap-5.5" data-testid="wizard-step-0">
      <FormField
        id={`${id}-locale`}
        label={t("locale.label")}
        labelSize="question"
        required
        help={t("locale.help")}
        error={fieldError(form.formState.errors.locale?.message)}
      >
        {(a11y) => (
          <NativeSelect {...a11y} {...form.register("locale")}>
            {locales.map((l) => (
              <option key={l} value={l} lang={l}>
                {localeNames[l]}
              </option>
            ))}
          </NativeSelect>
        )}
      </FormField>
      <PhoneOtpFields form={form} />
      <FormField
        id={`${id}-referral`}
        label={t("referralCode.label")}
        labelSize="question"
        labelAddon={<DisclosureIcon variant="private" />}
        help={t("referralCode.help")}
        error={fieldError(form.formState.errors.referralCode?.message)}
      >
        {(a11y) => (
          <Input
            {...a11y}
            autoCapitalize="characters"
            autoComplete="off"
            {...form.register("referralCode")}
          />
        )}
      </FormField>
      <DisclosureSummary blind={[]} hidden={[t("phone"), t("referralCode.label")]} />
      {failed ? (
        <p role="alert" className="text-caption text-error-text" data-testid="wizard-error">
          {serverText(failed.code, failed.retryAfterSec)}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="seeker"
        className="w-full"
        disabled={pending}
        data-testid="wizard-next"
      >
        {pending ? t("submitting") : t("submit")}
        <ArrowRight aria-hidden="true" strokeWidth={1.5} />
      </Button>
    </form>
  );
}
