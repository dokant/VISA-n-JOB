"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useId, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

import { FormField } from "@/components/forms/form-field";
import { BlockedNotice } from "@/components/seeker/blocked-notice";
import { PhoneOtpFields } from "@/components/seeker/phone-otp-fields";
import { useFieldError, useServerErrorText } from "@/components/seeker/wizard-shell";
import { ConsentRow } from "@/components/seeker/wizard-steps-b";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { VisaLabel } from "@/components/visa/visa-label";
import { type Locale, localeNames, locales } from "@/i18n/locales";
import type { CodeOption } from "@/lib/referenceData";
import type { RegistrationConsent } from "@/lib/seeker/options";
import type { WizardVisaOption } from "@/lib/seeker/reference";
import { type QuickInput, quickSchemaFor } from "@/schemas/seeker/quick";
import { type RegisterActionState, quickRegister } from "@/server/actions/seeker/register";

/**
 * 간편 등록 (R-105, WO §7.2): ① 언어 ② 현재 비자 ③ 거주 시·도 ④ 휴대폰(OTP) ⑤ 필수 동의 — one
 * screen, at most 7 questions. A visa that cannot register shows the consult guidance instead
 * (BR-08); the server refuses it as well.
 */
export function QuickRegisterForm({
  visas,
  sido,
  initialSido,
  documents,
}: {
  visas: WizardVisaOption[];
  sido: CodeOption[];
  initialSido: string;
  documents: Partial<Record<RegistrationConsent, ReactNode>>;
}) {
  const t = useTranslations("seeker.quick");
  const tc = useTranslations();
  const locale = useLocale() as Locale;
  const fieldError = useFieldError();
  const serverText = useServerErrorText();
  const id = useId();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<RegisterActionState | null>(null);
  const blindRequired = visas.filter((v) => v.blindRequired).map((v) => v.code);
  const form = useForm<QuickInput>({
    resolver: zodResolver(quickSchemaFor(blindRequired)),
    defaultValues: {
      locale,
      visaCode: "",
      sido: initialSido,
      phone: "",
      code: "",
      privacyRequired: false,
      blindProfile: false,
      notice: false,
    },
  });
  const e = form.formState.errors;
  const visaCode = form.watch("visaCode");
  const visa = visas.find((v) => v.code === visaCode);
  const blocked = visa != null && !visa.registrable;

  const submit = form.handleSubmit((values) =>
    startTransition(async () => {
      setState(null);
      const r = await quickRegister(values);
      if (r.ok) {
        window.location.assign(r.redirectTo);
        return;
      }
      for (const [field, code] of Object.entries(r.fieldErrors ?? {})) {
        form.setError(field as keyof QuickInput, { type: "server", message: code });
      }
      setState(r);
    }),
  );
  const failed = state && !state.ok ? state : null;

  const consent = (
    field: "privacyRequired" | "blindProfile" | "notice",
    type: RegistrationConsent,
  ) => (
    <Controller
      control={form.control}
      name={field}
      render={({ field: f }) => (
        <ConsentRow
          ref={f.ref}
          id={`${id}-${field}`}
          label={tc(`seeker.register.step7.${field}.label`)}
          required={field !== "blindProfile" || (visa?.blindRequired ?? true)}
          checked={f.value}
          onChange={f.onChange}
          error={fieldError(e[field]?.message)}
          document={documents[type]}
          testId={`consent-${type}`}
        />
      )}
    />
  );

  return (
    <form noValidate onSubmit={submit} className="grid gap-5.5" data-testid="quick-register-form">
      <FormField
        id={`${id}-locale`}
        label={t("locale")}
        labelSize="question"
        required
        error={fieldError(e.locale?.message)}
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
      <FormField
        id={`${id}-visa`}
        label={t("visa")}
        labelSize="question"
        required
        help={t("visaHelp")}
        error={fieldError(e.visaCode?.message)}
      >
        {(a11y) => (
          <NativeSelect {...a11y} {...form.register("visaCode")} data-testid="visa-select">
            <option value="">{tc("common.select.placeholder")}</option>
            {visas.map((v) => (
              <option key={v.code} value={v.code}>
                {v.isStatusCode ? [v.code, tc(v.nameKey)].join(" ") : tc(v.nameKey)}
              </option>
            ))}
          </NativeSelect>
        )}
      </FormField>
      {visa ? (
        <p className="-mt-3 text-dense text-n700">
          <VisaLabel code={visa.code} nameKey={visa.nameKey} showCode={visa.isStatusCode} />
        </p>
      ) : null}
      {blocked ? (
        <BlockedNotice reason="VISA_NOT_REGISTRABLE" />
      ) : (
        <>
          <FormField
            id={`${id}-sido`}
            label={t("sido")}
            labelSize="question"
            required
            error={fieldError(e.sido?.message)}
          >
            {(a11y) => (
              <NativeSelect {...a11y} {...form.register("sido")}>
                <option value="">{tc("common.select.placeholder")}</option>
                {sido.map((r) => (
                  <option key={r.code} value={r.code}>
                    {tc(r.nameKey)}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <PhoneOtpFields form={form} />
          <div className="grid gap-3">
            {consent("privacyRequired", "PRIVACY_REQUIRED")}
            {consent("blindProfile", "BLIND_PROFILE")}
            {consent("notice", "NOTICE")}
          </div>
        </>
      )}
      {failed?.code === "BLOCKED" ? <BlockedNotice reason={failed.reason} /> : null}
      {failed && failed.code !== "BLOCKED" && failed.code !== "VALIDATION" ? (
        <p role="alert" className="text-caption text-error-text" data-testid="wizard-error">
          {serverText(failed.code, failed.retryAfterSec)}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="seeker"
        className="w-full"
        disabled={pending || blocked}
        data-testid="quick-submit"
      >
        {pending ? t("submitting") : t("submit")}
        <ArrowRight aria-hidden="true" strokeWidth={1.5} />
      </Button>
    </form>
  );
}
