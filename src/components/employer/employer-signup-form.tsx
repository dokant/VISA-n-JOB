"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { codeToKey } from "@/components/forms/error-key";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { PASSWORD_MIN_LENGTH } from "@/config/limits";
import { type EmployerSignupInput, employerSignupSchema } from "@/schemas/auth/auth";
import { signUpEmployer } from "@/server/actions/employer/account";

type Option = { code: string; label: string };

/** /[locale]/employer/signup (R-123). Industry and 시·도 options come from the database. */
export function EmployerSignupForm({
  industries,
  sidos,
}: {
  industries: Option[];
  sidos: Option[];
}) {
  const t = useTranslations("employer.signup");
  const tc = useTranslations("common.select");
  const te = useTranslations("errors");
  const locale = useLocale();
  const id = useId();
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<EmployerSignupInput>({
    resolver: zodResolver(employerSignupSchema),
    defaultValues: {
      companyName: "",
      bizRegNo: "",
      industryCode: "",
      sido: "",
      email: "",
      password: "",
      passwordConfirm: "",
    },
  });
  const { errors } = form.formState;
  const fieldError = (code: string | undefined) =>
    code ? te(`field.${code}`, { min: PASSWORD_MIN_LENGTH }) : undefined;

  const onSubmit = (values: EmployerSignupInput) =>
    startTransition(async () => {
      setServerError(null);
      const r = await signUpEmployer({ ...values, locale });
      if (!r || r.ok) return;
      const key = `auth.${codeToKey(r.code)}`;
      const text = te.has(key) ? te(key) : te("auth.unknown");
      if (r.field === "bizRegNo" || r.field === "email") {
        form.setError(r.field, { type: "server", message: undefined });
        form.setFocus(r.field);
      }
      setServerError(text);
    });

  return (
    <form
      noValidate
      className="grid gap-5.5"
      data-testid="employer-signup-form"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <FormField
        id={`${id}-companyName`}
        label={t("companyName.label")}
        required
        error={fieldError(errors.companyName?.message)}
      >
        {(a11y) => (
          <Input {...a11y} autoComplete="organization" {...form.register("companyName")} />
        )}
      </FormField>
      <FormField
        id={`${id}-bizRegNo`}
        label={t("bizRegNo.label")}
        required
        help={t("bizRegNo.help")}
        error={fieldError(errors.bizRegNo?.message)}
      >
        {(a11y) => (
          <Input
            {...a11y}
            inputMode="numeric"
            placeholder={t("bizRegNo.placeholder")}
            {...form.register("bizRegNo")}
          />
        )}
      </FormField>
      <FormField
        id={`${id}-industryCode`}
        label={t("industryCode.label")}
        required
        error={fieldError(errors.industryCode?.message)}
      >
        {(a11y) => (
          <NativeSelect {...a11y} {...form.register("industryCode")}>
            <option value="">{tc("placeholder")}</option>
            {industries.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        )}
      </FormField>
      <FormField
        id={`${id}-sido`}
        label={t("sido.label")}
        required
        error={fieldError(errors.sido?.message)}
      >
        {(a11y) => (
          <NativeSelect {...a11y} {...form.register("sido")}>
            <option value="">{tc("placeholder")}</option>
            {sidos.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        )}
      </FormField>
      <FormField
        id={`${id}-email`}
        label={t("email.label")}
        required
        error={fieldError(errors.email?.message)}
      >
        {(a11y) => (
          <Input {...a11y} type="email" autoComplete="email" {...form.register("email")} />
        )}
      </FormField>
      <FormField
        id={`${id}-password`}
        label={t("password.label")}
        required
        help={t("password.help", { min: PASSWORD_MIN_LENGTH })}
        error={fieldError(errors.password?.message)}
      >
        {(a11y) => (
          <Input
            {...a11y}
            type="password"
            autoComplete="new-password"
            {...form.register("password")}
          />
        )}
      </FormField>
      <FormField
        id={`${id}-passwordConfirm`}
        label={t("passwordConfirm.label")}
        required
        error={fieldError(errors.passwordConfirm?.message)}
      >
        {(a11y) => (
          <Input
            {...a11y}
            type="password"
            autoComplete="new-password"
            {...form.register("passwordConfirm")}
          />
        )}
      </FormField>
      {serverError ? (
        <p role="alert" className="text-caption text-error-text" data-testid="auth-error">
          {serverError}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        <Building2 aria-hidden="true" strokeWidth={1.5} />
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
