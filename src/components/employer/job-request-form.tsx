"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, CircleCheck, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

import { ChipGroup } from "@/components/forms/choice-chips";
import { codeToKey } from "@/components/forms/error-key";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  DORMITORY_OPTIONS,
  JOB_REQUEST_STEPS,
  type JobRequestInput,
  MEALS_OPTIONS,
  OVERTIME_OPTIONS,
  START_TIMING_OPTIONS,
  jobRequestSchema,
} from "@/schemas/employer/request";
import { type JobRequestState, submitJobRequestAction } from "@/server/actions/employer/request";

type Option = { code: string; label: string };
type SigunguOption = { code: string; parentCode: string; nameKo: string };
type StepName = keyof typeof JOB_REQUEST_STEPS;
type FieldName = keyof JobRequestInput;

const STEPS = Object.keys(JOB_REQUEST_STEPS) as StepName[];

type Props = {
  sidos: Option[];
  sigungus: SigunguOption[];
  /** Current company values (decrypted name etc.) to prefill step 1. */
  defaults: { companyName: string; sido: string; sigungu: string; employeeCount: string };
};

/**
 * 구인 의뢰서 (R-125, WO §9.2). Three screens of ≤7 questions (STANDARD 3.3). Free-text fields are
 * checked by pii-guard in the shared schema: a contact pattern is refused with the reason shown
 * right under the field (BR-14), and the server checks the same schema again.
 */
export function JobRequestForm({ sidos, sigungus, defaults }: Props) {
  const t = useTranslations("employer.request");
  const tc = useTranslations("common.select");
  const te = useTranslations("errors");
  const id = useId();
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<JobRequestInput>({
    resolver: zodResolver(jobRequestSchema),
    shouldFocusError: true,
    defaultValues: {
      ...defaults,
      contactName: "",
      contactPhone: "",
      contactEmail: "",
      role: "",
      payMin: "",
      payMax: "",
      workHours: "",
      headcount: "",
      preferences: "",
      detail: "",
    },
  });
  const { errors } = form.formState;
  const sido = form.watch("sido");
  const sigunguOptions = sigungus.filter((g) => g.parentCode === sido);
  const fieldError = (code: string | undefined) => (code ? te(`field.${code}`) : undefined);
  const stepName = STEPS[step];

  // Move focus to the screen heading when the screen changes (not on the first render).
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) headingRef.current?.focus();
    mounted.current = true;
  }, [step, done]);

  const next = async () => {
    const ok = await form.trigger([...JOB_REQUEST_STEPS[stepName]] as FieldName[], {
      shouldFocus: true,
    });
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const showServerError = (r: Exclude<JobRequestState, { ok: true }>) => {
    const key = `employer.${codeToKey(r.code)}`;
    setServerError(te.has(key) ? te(key) : te("employer.unknown"));
    const fields = (r.fields ?? []).filter((f): f is FieldName => f in form.getValues());
    if (fields.length === 0) return;
    for (const f of fields) {
      form.setError(f, {
        type: "server",
        message: r.code === "CONTACT_INFO" ? "contactInfo" : "invalidValue",
      });
    }
    const first = STEPS.findIndex((s) =>
      (JOB_REQUEST_STEPS[s] as readonly string[]).some((f) => fields.includes(f as FieldName)),
    );
    if (first >= 0) setStep(first);
  };

  const onSubmit = (values: JobRequestInput) =>
    startTransition(async () => {
      setServerError(null);
      const r = await submitJobRequestAction(values);
      if (r.ok) {
        setDone(true);
        router.refresh();
        return;
      }
      showServerError(r);
    });

  if (done) {
    return (
      <section
        className="grid gap-4 rounded-md border border-success bg-success-subtle p-6 text-success-subtle-foreground"
        data-testid="job-request-done"
      >
        <div className="flex items-center gap-3">
          <CircleCheck aria-hidden="true" strokeWidth={1.5} className="size-6 text-success" />
          <h2 ref={headingRef} tabIndex={-1} className="text-h3 text-navy">
            {t("done.title")}
          </h2>
        </div>
        <p className="text-dense">{t("done.body")}</p>
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              form.reset();
              setStep(0);
              setDone(false);
            }}
          >
            {t("done.again")}
          </Button>
        </div>
      </section>
    );
  }

  const choice = (
    name: "overtime" | "startTiming" | "dormitory" | "meals",
    options: readonly string[],
  ) => (
    <FormField
      id={`${id}-${name}`}
      label={t(`${name}.label`)}
      required
      error={fieldError(errors[name]?.message)}
    >
      {(a11y) => (
        <Controller
          control={form.control}
          name={name}
          render={({ field }) => (
            <ChipGroup
              ref={field.ref}
              a11y={a11y}
              name={name}
              value={(field.value as string | undefined) ?? ""}
              onChange={field.onChange}
              testId={`job-request-${name}`}
              options={options.map((v) => ({ value: v, label: t(`${name}.option.${v}`) }))}
            />
          )}
        />
      )}
    </FormField>
  );

  const text = (name: FieldName, opts: { required?: boolean; help?: boolean; ph?: boolean }) => (
    <FormField
      id={`${id}-${name}`}
      label={t(`${name}.label`)}
      required={opts.required}
      help={opts.help ? t(`${name}.help`) : undefined}
      error={fieldError(errors[name]?.message)}
    >
      {(a11y) => (
        <Input
          {...a11y}
          placeholder={opts.ph ? t(`${name}.placeholder`) : undefined}
          {...form.register(name)}
        />
      )}
    </FormField>
  );

  return (
    <form
      noValidate
      className="grid gap-5.5"
      data-testid="job-request-form"
      data-step={stepName}
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="grid gap-2">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-label text-n700"
          data-testid="job-request-progress"
        >
          {t("progress", {
            current: step + 1,
            total: STEPS.length,
            name: t(`steps.${stepName}`),
          })}
        </h2>
        <Progress value={step + 1} max={STEPS.length} aria-label={t(`steps.${stepName}`)} />
      </div>

      {stepName === "company" ? (
        <>
          {text("companyName", { required: true, help: true })}
          <FormField
            id={`${id}-sido`}
            label={t("sido.label")}
            required
            error={fieldError(errors.sido?.message ?? errors.sigungu?.message)}
          >
            {(a11y) => (
              <div className="grid gap-2 sm:grid-cols-2">
                <NativeSelect
                  {...a11y}
                  {...form.register("sido", { onChange: () => form.setValue("sigungu", "") })}
                >
                  <option value="">{tc("placeholder")}</option>
                  {sidos.map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.label}
                    </option>
                  ))}
                </NativeSelect>
                <NativeSelect
                  aria-label={t("sigungu.label")}
                  disabled={!sido}
                  {...form.register("sigungu")}
                >
                  <option value="">{sido ? tc("placeholder") : t("sigungu.placeholder")}</option>
                  {sigunguOptions.map((g) => (
                    <option key={g.code} value={g.code}>
                      {g.nameKo}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            )}
          </FormField>
          <FormField
            id={`${id}-employeeCount`}
            label={t("employeeCount.label")}
            required
            error={fieldError(errors.employeeCount?.message)}
          >
            {(a11y) => <Input {...a11y} inputMode="numeric" {...form.register("employeeCount")} />}
          </FormField>
          {text("contactName", { required: true })}
          <FormField
            id={`${id}-contactPhone`}
            label={t("contactPhone.label")}
            required
            help={t("contactPhone.help")}
            error={fieldError(errors.contactPhone?.message)}
          >
            {(a11y) => (
              <Input {...a11y} type="tel" autoComplete="tel" {...form.register("contactPhone")} />
            )}
          </FormField>
          <FormField
            id={`${id}-contactEmail`}
            label={t("contactEmail.label")}
            error={fieldError(errors.contactEmail?.message)}
          >
            {(a11y) => (
              <Input
                {...a11y}
                type="email"
                autoComplete="email"
                {...form.register("contactEmail")}
              />
            )}
          </FormField>
        </>
      ) : null}

      {stepName === "job" ? (
        <>
          {text("role", { required: true, ph: true })}
          <FormField
            id={`${id}-payMin`}
            label={t("pay.label")}
            required
            error={fieldError(errors.payMin?.message ?? errors.payMax?.message)}
          >
            {(a11y) => (
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  {...a11y}
                  inputMode="numeric"
                  placeholder={t("pay.min")}
                  {...form.register("payMin")}
                />
                <Input
                  aria-label={t("pay.max")}
                  inputMode="numeric"
                  placeholder={t("pay.max")}
                  {...form.register("payMax")}
                />
              </div>
            )}
          </FormField>
          {text("workHours", { required: true, ph: true })}
          {choice("overtime", OVERTIME_OPTIONS)}
          <FormField
            id={`${id}-headcount`}
            label={t("headcount.label")}
            required
            error={fieldError(errors.headcount?.message)}
          >
            {(a11y) => <Input {...a11y} inputMode="numeric" {...form.register("headcount")} />}
          </FormField>
          {choice("startTiming", START_TIMING_OPTIONS)}
        </>
      ) : null}

      {stepName === "living" ? (
        <>
          {choice("dormitory", DORMITORY_OPTIONS)}
          {choice("meals", MEALS_OPTIONS)}
          <FormField
            id={`${id}-preferences`}
            label={t("preferences.label")}
            help={t("preferences.help")}
            error={fieldError(errors.preferences?.message)}
          >
            {(a11y) => <Textarea {...a11y} rows={4} {...form.register("preferences")} />}
          </FormField>
          <FormField
            id={`${id}-detail`}
            label={t("detail.label")}
            error={fieldError(errors.detail?.message)}
          >
            {(a11y) => <Textarea {...a11y} rows={4} {...form.register("detail")} />}
          </FormField>
        </>
      ) : null}

      {serverError ? (
        <p role="alert" className="text-caption text-error-text" data-testid="job-request-error">
          {serverError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {step > 0 ? (
          <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft aria-hidden="true" strokeWidth={1.5} />
            {t("prev")}
          </Button>
        ) : null}
        {step < STEPS.length - 1 ? (
          <Button type="button" className="flex-1 sm:flex-none" onClick={() => void next()}>
            {t("next")}
            <ArrowRight aria-hidden="true" strokeWidth={1.5} data-icon="trailing" />
          </Button>
        ) : (
          <Button type="submit" variant="brand" className="flex-1 sm:flex-none" disabled={pending}>
            <Send aria-hidden="true" strokeWidth={1.5} />
            {pending ? t("submitting") : t("submit")}
          </Button>
        )}
      </div>
    </form>
  );
}
