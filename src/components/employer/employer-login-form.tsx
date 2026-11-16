"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { codeToKey } from "@/components/forms/error-key";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type EmployerLoginInput, employerLoginSchema } from "@/schemas/auth/auth";
import { signInEmployer } from "@/server/actions/employer/account";

/** /[locale]/employer/login (R-123). */
export function EmployerLoginForm({ next }: { next?: string }) {
  const t = useTranslations("employer.login");
  const te = useTranslations("errors");
  const locale = useLocale();
  const id = useId();
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<EmployerLoginInput>({
    resolver: zodResolver(employerLoginSchema),
    defaultValues: { email: "", password: "" },
  });
  const { errors } = form.formState;
  const fieldError = (code: string | undefined) => (code ? te(`field.${code}`) : undefined);

  const onSubmit = (values: EmployerLoginInput) =>
    startTransition(async () => {
      setServerError(null);
      const r = await signInEmployer({ ...values, locale, next });
      if (!r || r.ok) return;
      const key = `auth.${codeToKey(r.code)}`;
      setServerError(te.has(key) ? te(key) : te("auth.unknown"));
    });

  return (
    <form
      noValidate
      className="grid gap-5.5"
      data-testid="employer-login-form"
      onSubmit={form.handleSubmit(onSubmit)}
    >
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
        error={fieldError(errors.password?.message)}
      >
        {(a11y) => (
          <Input
            {...a11y}
            type="password"
            autoComplete="current-password"
            {...form.register("password")}
          />
        )}
      </FormField>
      {serverError ? (
        <p role="alert" className="text-caption text-error-text" data-testid="auth-error">
          {serverError}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        <LogIn aria-hidden="true" strokeWidth={1.5} />
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
