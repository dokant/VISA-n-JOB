"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";

import { ChipGroup, MultiChips } from "@/components/forms/choice-chips";
import {
  type Disclosure,
  DisclosureIcon,
  DisclosureSummary,
} from "@/components/forms/disclosure-badge";
import { FormField } from "@/components/forms/form-field";
import { MonthSelect } from "@/components/forms/month-select";
import { BlockedNotice } from "@/components/seeker/blocked-notice";
import { WizardNav, useFieldError, useStepSubmit } from "@/components/seeker/wizard-shell";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { VisaLabel } from "@/components/visa/visa-label";
import {
  ENTRY_YEAR_RANGE,
  GRADUATION_YEARS_AHEAD,
  GRADUATION_YEARS_BACK,
  SEEKER_MAX_AGE,
  SEEKER_MIN_AGE,
  STAY_EXPIRY_YEARS_AHEAD,
  STAY_EXPIRY_YEARS_BACK,
} from "@/config/limits";
import {
  COUNTRY_CODES,
  EDUCATION_LEVELS,
  GENDERS,
  KIIP_STAGES,
  KOREAN_SPEAKING_LEVELS,
  LANGUAGE_CODES,
  MESSENGER_TYPES,
  TOPIK_LEVELS,
  UNKNOWN,
  YES_NO,
  YES_NO_UNKNOWN,
} from "@/lib/seeker/options";
import { type Step1Input, step1Schema } from "@/schemas/seeker/register/step1";
import { type Step2Input, step2Schema } from "@/schemas/seeker/register/step2";
import {
  type Step3aInput,
  type Step3bInput,
  step3aSchemaFor,
  step3bSchema,
} from "@/schemas/seeker/register/step3";

import type { ClientReference } from "./wizard-types";

/** Labels of one step: `seeker.register.{step}.{field}.{label|help|option.X}`. */
export function useStepText(step: string) {
  const t = useTranslations(`seeker.register.${step}`);
  return {
    label: (field: string) => t(`${field}.label`),
    help: (field: string, values?: Record<string, string | number>) =>
      t.has(`${field}.help`) ? t(`${field}.help`, values) : undefined,
    option: (field: string, value: string) => t(`${field}.option.${value}`),
    text: (key: string, values?: Record<string, string | number>) => t(key, values),
  };
}

/** Country names in the viewer's language (Intl), "OTHER" from messages. */
export function useCountryName() {
  const locale = useLocale();
  const t = useTranslations("seeker.register.common");
  const names = useMemo(() => new Intl.DisplayNames([locale], { type: "region" }), [locale]);
  return (code: string) => (code === "OTHER" ? t("otherCountry") : (names.of(code) ?? code));
}

function useLanguageName() {
  const locale = useLocale();
  const t = useTranslations("seeker.register.common");
  const names = useMemo(() => new Intl.DisplayNames([locale], { type: "language" }), [locale]);
  return (code: string) => (code === "OTHER" ? t("otherLanguage") : (names.of(code) ?? code));
}

function range(from: number, to: number): number[] {
  const out: number[] = [];
  for (let y = from; from <= to ? y <= to : y >= to; y += from <= to ? 1 : -1) out.push(y);
  return out;
}

type Props<V> = { values: V; reference: ClientReference; backHref?: string };

const icon = (d: Disclosure) => <DisclosureIcon variant={d} />;

// ─── Step 1 기본 정보 ─────────────────────────────────────────────────────────

export function Step1Form({ values, reference, backHref }: Props<Step1Input>) {
  const s = useStepText("step1");
  const tc = useTranslations();
  const fieldError = useFieldError();
  const country = useCountryName();
  const id = useId();
  const form = useForm<Step1Input>({ resolver: zodResolver(step1Schema), defaultValues: values });
  const { submit, pending, state } = useStepSubmit("1", form);
  const e = form.formState.errors;
  const sido = form.watch("sido");
  const messengerType = form.watch("messengerType");
  const sigungu = reference.sigungu.filter((g) => g.parentCode === sido);

  return (
    <form noValidate onSubmit={submit} className="grid gap-5.5" data-testid="wizard-step-1">
      <FormField
        id={`${id}-name`}
        label={s.label("legalName")}
        labelSize="question"
        labelAddon={icon("private")}
        required
        help={s.help("legalName")}
        error={fieldError(e.legalName?.message)}
      >
        {(a11y) => <Input {...a11y} autoComplete="name" {...form.register("legalName")} />}
      </FormField>
      <FormField
        id={`${id}-nat`}
        label={s.label("nationality")}
        labelSize="question"
        labelAddon={icon("blind")}
        required
        error={fieldError(e.nationality?.message)}
      >
        {(a11y) => (
          <NativeSelect {...a11y} {...form.register("nationality")}>
            <option value="">{tc("common.select.placeholder")}</option>
            {COUNTRY_CODES.map((c) => (
              <option key={c} value={c}>
                {country(c)}
              </option>
            ))}
          </NativeSelect>
        )}
      </FormField>
      <FormField
        id={`${id}-sido`}
        label={s.label("region")}
        labelSize="question"
        labelAddon={icon("blind")}
        required
        help={s.help("region")}
        error={fieldError(e.sido?.message ?? e.sigungu?.message)}
      >
        {(a11y) => (
          <div className="grid gap-2 sm:grid-cols-2">
            <NativeSelect
              {...a11y}
              {...form.register("sido", { onChange: () => form.setValue("sigungu", "") })}
            >
              <option value="">{s.text("sido")}</option>
              {reference.sido.map((r) => (
                <option key={r.code} value={r.code}>
                  {tc(r.nameKey)}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              aria-label={s.text("sigungu")}
              disabled={!sido}
              {...form.register("sigungu")}
            >
              <option value="">{s.text("sigungu")}</option>
              {sigungu.map((g) => (
                <option key={g.code} value={g.code}>
                  {g.nameKo}
                </option>
              ))}
            </NativeSelect>
          </div>
        )}
      </FormField>
      <FormField
        id={`${id}-msg`}
        label={s.label("messenger")}
        labelSize="question"
        labelAddon={icon("private")}
        help={s.help("messenger")}
        error={fieldError(e.messengerType?.message ?? e.messengerId?.message)}
      >
        {(a11y) => (
          <div className="grid gap-2 sm:grid-cols-2">
            <NativeSelect {...a11y} {...form.register("messengerType")}>
              <option value="">{tc("common.select.placeholder")}</option>
              {MESSENGER_TYPES.map((m) => (
                <option key={m} value={m}>
                  {s.option("messenger", m)}
                </option>
              ))}
            </NativeSelect>
            {messengerType && messengerType !== "NONE" ? (
              <Input
                aria-label={s.text("messengerId")}
                placeholder={s.text("messengerId")}
                {...form.register("messengerId")}
              />
            ) : null}
          </div>
        )}
      </FormField>
      <FormField
        id={`${id}-email`}
        label={s.label("email")}
        labelSize="question"
        labelAddon={icon("private")}
        error={fieldError(e.email?.message)}
      >
        {(a11y) => (
          <Input {...a11y} type="email" autoComplete="email" {...form.register("email")} />
        )}
      </FormField>
      <FormField
        id={`${id}-birth`}
        label={s.label("birthYear")}
        labelSize="question"
        labelAddon={icon("private")}
        help={s.help("birthYear")}
        error={fieldError(e.birthYear?.message)}
      >
        {(a11y) => (
          <NativeSelect {...a11y} {...form.register("birthYear")}>
            <option value="">{tc("common.select.placeholder")}</option>
            {range(reference.nowYear - SEEKER_MIN_AGE, reference.nowYear - SEEKER_MAX_AGE).map(
              (y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ),
            )}
          </NativeSelect>
        )}
      </FormField>
      <FormField
        id={`${id}-gender`}
        label={s.label("gender")}
        labelSize="question"
        labelAddon={icon("private")}
        help={s.help("gender")}
        error={fieldError(e.gender?.message)}
      >
        {(a11y) => (
          <Controller
            control={form.control}
            name="gender"
            render={({ field }) => (
              <ChipGroup
                ref={field.ref}
                a11y={a11y}
                name="gender"
                value={field.value}
                onChange={field.onChange}
                options={GENDERS.map((g) => ({ value: g, label: s.option("gender", g) }))}
              />
            )}
          />
        )}
      </FormField>
      <WizardNav backHref={backHref} pending={pending} state={state}>
        <DisclosureSummary
          blind={[s.label("nationality"), s.text("sidoOnly")]}
          hidden={[
            s.label("legalName"),
            s.label("messenger"),
            s.label("email"),
            s.label("birthYear"),
            s.label("gender"),
          ]}
        />
      </WizardNav>
    </form>
  );
}

// ─── Step 2 체류자격 ──────────────────────────────────────────────────────────

export function Step2Form({ values, reference, backHref }: Props<Step2Input>) {
  const s = useStepText("step2");
  const tc = useTranslations();
  const fieldError = useFieldError();
  const id = useId();
  const form = useForm<Step2Input>({ resolver: zodResolver(step2Schema), defaultValues: values });
  const { submit, pending, state } = useStepSubmit("2", form);
  const e = form.formState.errors;
  const visaCode = form.watch("visaCode");
  const visa = reference.visas.find((v) => v.code === visaCode);
  const blocked = visa != null && !visa.registrable;

  return (
    <form noValidate onSubmit={submit} className="grid gap-5.5" data-testid="wizard-step-2">
      <FormField
        id={`${id}-visa`}
        label={s.label("visaCode")}
        labelSize="question"
        labelAddon={icon("blind")}
        required
        help={s.help("visaCode")}
        error={fieldError(e.visaCode?.message)}
      >
        {(a11y) => (
          <NativeSelect
            {...a11y}
            {...form.register("visaCode", { onChange: () => form.setValue("visaSubType", "") })}
            data-testid="visa-select"
          >
            <option value="">{tc("common.select.placeholder")}</option>
            {reference.visas.map((v) => (
              <option key={v.code} value={v.code}>
                {v.isStatusCode ? [v.code, tc(v.nameKey)].join(" ") : tc(v.nameKey)}
              </option>
            ))}
          </NativeSelect>
        )}
      </FormField>
      {visa ? (
        <p className="-mt-3 text-dense text-n700" data-testid="visa-selected">
          <VisaLabel code={visa.code} nameKey={visa.nameKey} showCode={visa.isStatusCode} />
        </p>
      ) : null}
      {blocked ? (
        <BlockedNotice reason="VISA_NOT_REGISTRABLE" />
      ) : (
        <>
          {visa && visa.subTypes.length > 0 ? (
            <FormField
              id={`${id}-sub`}
              label={s.label("visaSubType")}
              labelSize="question"
              labelAddon={icon("blind")}
              error={fieldError(e.visaSubType?.message)}
            >
              {(a11y) => (
                <Controller
                  control={form.control}
                  name="visaSubType"
                  render={({ field }) => (
                    <ChipGroup
                      ref={field.ref}
                      a11y={a11y}
                      name="visaSubType"
                      value={field.value}
                      onChange={field.onChange}
                      options={[
                        ...visa.subTypes.map((st) => ({ value: st, label: st })),
                        { value: UNKNOWN, label: tc("seeker.register.common.unknown") },
                      ]}
                    />
                  )}
                />
              )}
            </FormField>
          ) : null}
          <FormField
            id={`${id}-exp`}
            label={s.label("stayExpiry")}
            labelSize="question"
            labelAddon={icon("blind")}
            required
            help={s.help("stayExpiry")}
            error={fieldError(e.stayExpiry?.message)}
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
                    fromYear={reference.nowYear - STAY_EXPIRY_YEARS_BACK}
                    toYear={reference.nowYear + STAY_EXPIRY_YEARS_AHEAD}
                  />
                )}
              />
            )}
          </FormField>
          <FormField
            id={`${id}-arc`}
            label={s.label("hasArc")}
            labelSize="question"
            labelAddon={icon("private")}
            required
            help={s.help("hasArc")}
            error={fieldError(e.hasArc?.message)}
          >
            {(a11y) => (
              <Controller
                control={form.control}
                name="hasArc"
                render={({ field }) => (
                  <ChipGroup
                    ref={field.ref}
                    a11y={a11y}
                    name="hasArc"
                    value={field.value}
                    onChange={field.onChange}
                    options={YES_NO.map((v) => ({
                      value: v,
                      label: tc(`seeker.register.common.${v === "YES" ? "yes" : "no"}`),
                    }))}
                  />
                )}
              />
            )}
          </FormField>
          <FormField
            id={`${id}-entry`}
            label={s.label("entryYear")}
            labelSize="question"
            labelAddon={icon("blind")}
            help={s.help("entryYear")}
            error={fieldError(e.entryYear?.message)}
          >
            {(a11y) => (
              <NativeSelect {...a11y} {...form.register("entryYear")}>
                <option value="">{tc("common.select.placeholder")}</option>
                <option value={UNKNOWN}>{tc("seeker.register.common.unknown")}</option>
                {range(reference.nowYear, reference.nowYear - ENTRY_YEAR_RANGE).map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <FormField
            id={`${id}-pending`}
            label={s.label("pendingApplication")}
            labelSize="question"
            labelAddon={icon("private")}
            error={fieldError(e.pendingApplication?.message)}
          >
            {(a11y) => (
              <Controller
                control={form.control}
                name="pendingApplication"
                render={({ field }) => (
                  <ChipGroup
                    ref={field.ref}
                    a11y={a11y}
                    name="pendingApplication"
                    value={field.value}
                    onChange={field.onChange}
                    options={YES_NO_UNKNOWN.map((v) => ({
                      value: v,
                      label: tc(`seeker.register.common.${v.toLowerCase()}`),
                    }))}
                  />
                )}
              />
            )}
          </FormField>
          <Controller
            control={form.control}
            name="visaConfirm"
            render={({ field }) => (
              <div className="grid gap-1.75">
                <label
                  className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-body text-navy"
                  htmlFor={`${id}-confirm`}
                >
                  <Checkbox
                    id={`${id}-confirm`}
                    checked={field.value}
                    onCheckedChange={(v) => field.onChange(v === true)}
                    aria-invalid={e.visaConfirm ? true : undefined}
                    aria-describedby={e.visaConfirm ? `${id}-confirm-error` : undefined}
                    className="mt-0.5"
                  />
                  <span>
                    {s.label("visaConfirm")}
                    <span className="ms-1 text-n500">{tc("common.form.required")}</span>
                  </span>
                </label>
                {e.visaConfirm ? (
                  <p
                    id={`${id}-confirm-error`}
                    role="alert"
                    className="text-caption text-error-text"
                  >
                    {fieldError(e.visaConfirm.message)}
                  </p>
                ) : null}
              </div>
            )}
          />
        </>
      )}
      <WizardNav backHref={backHref} pending={pending || blocked} state={state}>
        <DisclosureSummary
          blind={[
            s.label("visaCode"),
            s.label("visaSubType"),
            s.text("stayBand"),
            s.text("yearsInKorea"),
          ]}
          hidden={[s.label("hasArc"), s.label("pendingApplication")]}
        />
      </WizardNav>
    </form>
  );
}

// ─── Step 3a 학력 / 3b 언어 (SC-01) ───────────────────────────────────────────

export function Step3aForm({ values, reference, backHref }: Props<Step3aInput>) {
  const s = useStepText("step3");
  const tc = useTranslations();
  const fieldError = useFieldError();
  const id = useId();
  const form = useForm<Step3aInput>({
    resolver: zodResolver(step3aSchemaFor(reference.requiresGraduationDate)),
    defaultValues: values,
  });
  const { submit, pending, state } = useStepSubmit("3a", form);
  const e = form.formState.errors;

  return (
    <form noValidate onSubmit={submit} className="grid gap-5.5" data-testid="wizard-step-3a">
      <FormField
        id={`${id}-edu`}
        label={s.label("educationLevel")}
        labelSize="question"
        labelAddon={icon("blind")}
        required
        error={fieldError(e.educationLevel?.message)}
      >
        {(a11y) => (
          <Controller
            control={form.control}
            name="educationLevel"
            render={({ field }) => (
              <ChipGroup
                ref={field.ref}
                a11y={a11y}
                name="educationLevel"
                value={field.value}
                onChange={field.onChange}
                options={EDUCATION_LEVELS.map((v) => ({
                  value: v,
                  label: s.option("educationLevel", v),
                }))}
              />
            )}
          />
        )}
      </FormField>
      <FormField
        id={`${id}-major`}
        label={s.label("major")}
        labelSize="question"
        labelAddon={icon("blind")}
        help={s.help("major")}
        error={fieldError(e.major?.message)}
      >
        {(a11y) => <Input {...a11y} {...form.register("major")} />}
      </FormField>
      <FormField
        id={`${id}-school`}
        label={s.label("schoolName")}
        labelSize="question"
        labelAddon={icon("private")}
        help={s.help("schoolName")}
        error={fieldError(e.schoolName?.message)}
      >
        {(a11y) => <Input {...a11y} {...form.register("schoolName")} />}
      </FormField>
      <FormField
        id={`${id}-grad`}
        label={s.label("graduationDate")}
        labelSize="question"
        labelAddon={icon("blind")}
        required={reference.requiresGraduationDate}
        help={s.help("graduationDate")}
        error={fieldError(e.graduationDate?.message)}
      >
        {(a11y) => (
          <Controller
            control={form.control}
            name="graduationDate"
            render={({ field }) => (
              <MonthSelect
                ref={field.ref}
                a11y={a11y}
                name="graduationDate"
                value={field.value}
                onChange={field.onChange}
                fromYear={reference.nowYear + GRADUATION_YEARS_AHEAD}
                toYear={reference.nowYear - GRADUATION_YEARS_BACK}
              />
            )}
          />
        )}
      </FormField>
      <WizardNav backHref={backHref} pending={pending} state={state}>
        <DisclosureSummary
          blind={[s.label("educationLevel"), s.text("majorField"), s.label("graduationDate")]}
          hidden={[s.label("schoolName")]}
        />
      </WizardNav>
      <span className="sr-only">
        {tc("seeker.register.common.subScreen", { current: 1, total: 2 })}
      </span>
    </form>
  );
}

export function Step3bForm({ values, backHref }: Props<Step3bInput>) {
  const s = useStepText("step3");
  const tc = useTranslations();
  const fieldError = useFieldError();
  const language = useLanguageName();
  const id = useId();
  const form = useForm<Step3bInput>({ resolver: zodResolver(step3bSchema), defaultValues: values });
  const { submit, pending, state } = useStepSubmit("3b", form);
  const e = form.formState.errors;

  const chips = (name: "topikLevel" | "kiipStage" | "koreanSpeaking", list: readonly string[]) => (
    <FormField
      id={`${id}-${name}`}
      label={s.label(name)}
      labelSize="question"
      labelAddon={icon("blind")}
      required
      help={s.help(name)}
      error={fieldError(e[name]?.message)}
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
              value={field.value}
              onChange={field.onChange}
              options={list.map((v) => ({ value: v, label: s.option(name, v) }))}
            />
          )}
        />
      )}
    </FormField>
  );

  return (
    <form noValidate onSubmit={submit} className="grid gap-5.5" data-testid="wizard-step-3b">
      {chips("topikLevel", TOPIK_LEVELS)}
      {chips("kiipStage", KIIP_STAGES)}
      {chips("koreanSpeaking", KOREAN_SPEAKING_LEVELS)}
      <FormField
        id={`${id}-lang`}
        label={s.label("otherLanguages")}
        labelSize="question"
        labelAddon={icon("blind")}
        error={fieldError(e.otherLanguages?.message)}
      >
        {(a11y) => (
          <Controller
            control={form.control}
            name="otherLanguages"
            render={({ field }) => (
              <MultiChips
                ref={field.ref}
                a11y={a11y}
                value={field.value}
                onChange={field.onChange}
                options={LANGUAGE_CODES.map((v) => ({ value: v, label: language(v) }))}
              />
            )}
          />
        )}
      </FormField>
      <WizardNav backHref={backHref} pending={pending} state={state}>
        <DisclosureSummary
          blind={[
            s.label("topikLevel"),
            s.label("kiipStage"),
            s.label("koreanSpeaking"),
            s.label("otherLanguages"),
          ]}
          hidden={[]}
        />
      </WizardNav>
      <span className="sr-only">
        {tc("seeker.register.common.subScreen", { current: 2, total: 2 })}
      </span>
    </form>
  );
}
