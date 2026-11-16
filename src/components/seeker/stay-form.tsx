"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

import { FormField } from "@/components/forms/form-field";
import { MonthSelect } from "@/components/forms/month-select";
import { useFieldError } from "@/components/seeker/wizard-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { STAY_EXPIRY_YEARS_AHEAD, STAY_EXPIRY_YEARS_BACK } from "@/config/limits";
import { type StaySettingsInput, staySettingsSchema } from "@/schemas/seeker/me";
import { saveStaySettings } from "@/server/actions/seeker/me";

/** /seeker/me/stay — 체류 만료월 + 만료 알림 받기 (WO §6.2, §7.7). */
export function StayForm({ values, nowYear }: { values: StaySettingsInput; nowYear: number }) {
  const t = useTranslations("seeker.stay");
  const fieldError = useFieldError();
  const id = useId();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState<boolean | null>(null);
  const form = useForm<StaySettingsInput>({
    resolver: zodResolver(staySettingsSchema),
    defaultValues: values,
  });

  const submit = form.handleSubmit((v) =>
    startTransition(async () => {
      const r = await saveStaySettings(v);
      setSaved(r.ok);
    }),
  );

  return (
    <form noValidate onSubmit={submit} className="grid gap-5.5" data-testid="stay-form">
      <FormField
        id={`${id}-exp`}
        label={t("expiry")}
        required
        error={fieldError(form.formState.errors.stayExpiry?.message)}
      >
        {(a11y) => (
          <Controller
            control={form.control}
            name="stayExpiry"
            render={({ field }) => (
              <MonthSelect
                ref={field.ref}
                a11y={a11y}
                name="stayExpiry"
                value={field.value}
                onChange={field.onChange}
                fromYear={nowYear - STAY_EXPIRY_YEARS_BACK}
                toYear={nowYear + STAY_EXPIRY_YEARS_AHEAD}
              />
            )}
          />
        )}
      </FormField>
      <Controller
        control={form.control}
        name="stayAlertOptIn"
        render={({ field }) => (
          <label
            htmlFor={`${id}-optin`}
            className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-body text-navy"
          >
            <Checkbox
              id={`${id}-optin`}
              checked={field.value}
              onCheckedChange={(v) => field.onChange(v === true)}
              className="mt-0.75"
              data-testid="stay-optin"
            />
            <span>{t("optIn")}</span>
          </label>
        )}
      />
      {saved !== null ? (
        <p
          role="status"
          className={saved ? "text-caption text-n700" : "text-caption text-error-text"}
          data-testid="stay-saved"
        >
          {saved ? t("saved") : t("error")}
        </p>
      ) : null}
      <div>
        <Button type="submit" variant="seeker" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}
