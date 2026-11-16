"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { type ReactNode, useId } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";

import { ChipGroup, MultiChips } from "@/components/forms/choice-chips";
import {
  type Disclosure,
  DisclosureIcon,
  DisclosureSummary,
} from "@/components/forms/disclosure-badge";
import { FormField } from "@/components/forms/form-field";
import { WizardNav, useFieldError, useStepSubmit } from "@/components/seeker/wizard-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  DESIRED_MAX_SELECTIONS,
  DESIRED_PAY_BANDS_KRW,
  EXPERIENCE_MAX_ROWS,
} from "@/config/limits";
import {
  ANY_REGION,
  CONSULT_TIMES,
  COUNTRY_CODES,
  JOB_ROLES,
  JOB_SEARCH_STATUSES,
  LICENSES,
  type RegistrationConsent,
  SHIFT_OK_VALUES,
  SKILLS,
  UNKNOWN,
  YES_NO,
} from "@/lib/seeker/options";
import { type Step4Input, step4Schema } from "@/schemas/seeker/register/step4";
import {
  STATUSES_NEEDING_START_DATE,
  type Step5aInput,
  type Step5bInput,
  step5aSchema,
  step5bSchema,
} from "@/schemas/seeker/register/step5";
import { type Step6Input, step6Schema } from "@/schemas/seeker/register/step6";
import { type Step7Input, step7SchemaFor } from "@/schemas/seeker/register/step7";

import { useCountryName, useStepText } from "./wizard-steps-a";
import type { ClientReference } from "./wizard-types";

type Props<V> = { values: V; reference: ClientReference; backHref?: string };

const icon = (d: Disclosure) => <DisclosureIcon variant={d} />;

function useYesNo() {
  const t = useTranslations("seeker.register.common");
  return YES_NO.map((v) => ({ value: v, label: v === "YES" ? t("yes") : t("no") }));
}

// ─── Step 4 경력과 기술 ───────────────────────────────────────────────────────

export function Step4Form({ values, reference, backHref }: Props<Step4Input>) {
  const s = useStepText("step4");
  const tc = useTranslations();
  const fieldError = useFieldError();
  const country = useCountryName();
  const id = useId();
  const form = useForm<Step4Input>({ resolver: zodResolver(step4Schema), defaultValues: values });
  const { submit, pending, state } = useStepSubmit("4", form);
  const rows = useFieldArray({ control: form.control, name: "experiences" });
  const e = form.formState.errors;

  return (
    <form noValidate onSubmit={submit} className="grid gap-5.5" data-testid="wizard-step-4">
      <fieldset className="grid gap-4">
        <legend className="mb-2 text-h3 text-navy">
          {s.label("experiences")}
          <DisclosureIcon variant="blind" />
        </legend>
        <p className="text-caption text-n500">{s.help("experiences")}</p>
        {rows.fields.map((row, i) => {
          const re = e.experiences?.[i];
          return (
            <div
              key={row.id}
              className="grid gap-3 rounded-md border border-n200 bg-white p-4"
              data-testid="experience-row"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-label text-n700">{s.text("experienceN", { n: i + 1 })}</p>
                <Button type="button" variant="ghost" size="sm" onClick={() => rows.remove(i)}>
                  <Trash2 aria-hidden="true" strokeWidth={1.5} />
                  {s.text("removeExperience")}
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  id={`${id}-c${i}`}
                  label={s.text("country")}
                  required
                  error={fieldError(re?.country?.message)}
                >
                  {(a11y) => (
                    <NativeSelect {...a11y} {...form.register(`experiences.${i}.country`)}>
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
                  id={`${id}-i${i}`}
                  label={s.text("industry")}
                  required
                  error={fieldError(re?.industryCode?.message)}
                >
                  {(a11y) => (
                    <NativeSelect {...a11y} {...form.register(`experiences.${i}.industryCode`)}>
                      <option value="">{tc("common.select.placeholder")}</option>
                      {reference.industries.map((o) => (
                        <option key={o.code} value={o.code}>
                          {tc(o.nameKey)}
                        </option>
                      ))}
                    </NativeSelect>
                  )}
                </FormField>
                <FormField
                  id={`${id}-r${i}`}
                  label={s.text("roleField")}
                  required
                  error={fieldError(re?.role?.message)}
                >
                  {(a11y) => (
                    <NativeSelect {...a11y} {...form.register(`experiences.${i}.role`)}>
                      <option value="">{tc("common.select.placeholder")}</option>
                      {JOB_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {s.option("role", r)}
                        </option>
                      ))}
                    </NativeSelect>
                  )}
                </FormField>
                <FormField
                  id={`${id}-m${i}`}
                  label={s.text("months")}
                  required
                  error={fieldError(re?.months?.message)}
                >
                  {(a11y) => (
                    <Input
                      {...a11y}
                      inputMode="numeric"
                      {...form.register(`experiences.${i}.months`)}
                    />
                  )}
                </FormField>
              </div>
              <FormField
                id={`${id}-n${i}`}
                label={s.text("employerName")}
                labelAddon={icon("private")}
                error={fieldError(re?.employerName?.message)}
              >
                {(a11y) => <Input {...a11y} {...form.register(`experiences.${i}.employerName`)} />}
              </FormField>
            </div>
          );
        })}
        {rows.fields.length < EXPERIENCE_MAX_ROWS ? (
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                rows.append({
                  country: "",
                  industryCode: "",
                  role: "",
                  months: "",
                  employerName: "",
                })
              }
              data-testid="add-experience"
            >
              <Plus aria-hidden="true" strokeWidth={1.5} />
              {s.text("addExperience")}
            </Button>
          </div>
        ) : null}
      </fieldset>
      <FormField
        id={`${id}-skills`}
        label={s.label("skills")}
        labelSize="question"
        labelAddon={icon("blind")}
        error={fieldError(e.skills?.message)}
      >
        {(a11y) => (
          <Controller
            control={form.control}
            name="skills"
            render={({ field }) => (
              <MultiChips
                a11y={a11y}
                value={field.value}
                onChange={field.onChange}
                options={SKILLS.map((v) => ({ value: v, label: s.option("skills", v) }))}
              />
            )}
          />
        )}
      </FormField>
      <FormField
        id={`${id}-lic`}
        label={s.label("licenses")}
        labelSize="question"
        labelAddon={icon("blind")}
        error={fieldError(e.licenses?.message)}
      >
        {(a11y) => (
          <Controller
            control={form.control}
            name="licenses"
            render={({ field }) => (
              <MultiChips
                a11y={a11y}
                value={field.value}
                onChange={field.onChange}
                options={LICENSES.map((v) => ({ value: v, label: s.option("licenses", v) }))}
              />
            )}
          />
        )}
      </FormField>
      <WizardNav backHref={backHref} pending={pending} state={state}>
        <DisclosureSummary
          blind={[s.text("experienceSummary"), s.label("skills"), s.label("licenses")]}
          hidden={[s.text("employerName")]}
        />
      </WizardNav>
    </form>
  );
}

// ─── Step 5a / 5b 희망 근무 조건 (SC-01) ──────────────────────────────────────

export function Step5aForm({ values, reference, backHref }: Props<Step5aInput>) {
  const s = useStepText("step5");
  const tc = useTranslations();
  const fieldError = useFieldError();
  const id = useId();
  const form = useForm<Step5aInput>({ resolver: zodResolver(step5aSchema), defaultValues: values });
  const { submit, pending, state } = useStepSubmit("5a", form);
  const e = form.formState.errors;
  const status = form.watch("jobSearchStatus");

  return (
    <form noValidate onSubmit={submit} className="grid gap-5.5" data-testid="wizard-step-5a">
      <FormField
        id={`${id}-status`}
        label={s.label("jobSearchStatus")}
        labelSize="question"
        labelAddon={icon("blind")}
        required
        error={fieldError(e.jobSearchStatus?.message)}
      >
        {(a11y) => (
          <Controller
            control={form.control}
            name="jobSearchStatus"
            render={({ field }) => (
              <ChipGroup
                a11y={a11y}
                name="jobSearchStatus"
                value={field.value}
                onChange={field.onChange}
                options={JOB_SEARCH_STATUSES.map((v) => ({
                  value: v,
                  label: s.option("jobSearchStatus", v),
                }))}
              />
            )}
          />
        )}
      </FormField>
      {STATUSES_NEEDING_START_DATE.includes(status) ? (
        <FormField
          id={`${id}-from`}
          label={s.label("availableFrom")}
          labelSize="question"
          labelAddon={icon("blind")}
          required
          error={fieldError(e.availableFrom?.message)}
        >
          {(a11y) => <Input {...a11y} type="date" {...form.register("availableFrom")} />}
        </FormField>
      ) : null}
      <FormField
        id={`${id}-ind`}
        label={s.label("desiredIndustries")}
        labelSize="question"
        labelAddon={icon("blind")}
        required
        help={s.help("desiredIndustries")}
        error={fieldError(e.desiredIndustries?.message)}
      >
        {(a11y) => (
          <Controller
            control={form.control}
            name="desiredIndustries"
            render={({ field }) => (
              <MultiChips
                a11y={a11y}
                max={DESIRED_MAX_SELECTIONS}
                value={field.value}
                onChange={field.onChange}
                options={reference.industries.map((o) => ({ value: o.code, label: tc(o.nameKey) }))}
              />
            )}
          />
        )}
      </FormField>
      <FormField
        id={`${id}-reg`}
        label={s.label("desiredRegions")}
        labelSize="question"
        labelAddon={icon("blind")}
        required
        help={s.help("desiredRegions")}
        error={fieldError(e.desiredRegions?.message)}
      >
        {(a11y) => (
          <Controller
            control={form.control}
            name="desiredRegions"
            render={({ field }) => (
              <MultiChips
                a11y={a11y}
                max={DESIRED_MAX_SELECTIONS}
                value={field.value}
                onChange={(next) => {
                  const added = next.find((v) => !field.value.includes(v));
                  field.onChange(
                    added === ANY_REGION ? [ANY_REGION] : next.filter((v) => v !== ANY_REGION),
                  );
                }}
                options={[
                  { value: ANY_REGION, label: s.text("anyRegion") },
                  ...reference.sido.map((o) => ({ value: o.code, label: tc(o.nameKey) })),
                ]}
              />
            )}
          />
        )}
      </FormField>
      <WizardNav backHref={backHref} pending={pending} state={state}>
        <DisclosureSummary
          blind={[
            s.label("jobSearchStatus"),
            s.label("availableFrom"),
            s.label("desiredIndustries"),
            s.label("desiredRegions"),
          ]}
          hidden={[]}
        />
      </WizardNav>
    </form>
  );
}

export function Step5bForm({ values, backHref }: Props<Step5bInput>) {
  const s = useStepText("step5");
  const tc = useTranslations();
  const format = useFormatter();
  const fieldError = useFieldError();
  const yesNo = useYesNo();
  const id = useId();
  const form = useForm<Step5bInput>({ resolver: zodResolver(step5bSchema), defaultValues: values });
  const { submit, pending, state } = useStepSubmit("5b", form);
  const e = form.formState.errors;
  const groupApply = form.watch("groupApply");

  return (
    <form noValidate onSubmit={submit} className="grid gap-5.5" data-testid="wizard-step-5b">
      <FormField
        id={`${id}-dorm`}
        label={s.label("needDormitory")}
        labelSize="question"
        labelAddon={icon("blind")}
        required
        error={fieldError(e.needDormitory?.message)}
      >
        {(a11y) => (
          <Controller
            control={form.control}
            name="needDormitory"
            render={({ field }) => (
              <ChipGroup
                a11y={a11y}
                name="needDormitory"
                value={field.value}
                onChange={field.onChange}
                options={yesNo}
              />
            )}
          />
        )}
      </FormField>
      <FormField
        id={`${id}-shift`}
        label={s.label("shiftOk")}
        labelSize="question"
        labelAddon={icon("blind")}
        required
        error={fieldError(e.shiftOk?.message)}
      >
        {(a11y) => (
          <Controller
            control={form.control}
            name="shiftOk"
            render={({ field }) => (
              <ChipGroup
                a11y={a11y}
                name="shiftOk"
                value={field.value}
                onChange={field.onChange}
                options={SHIFT_OK_VALUES.map((v) => ({ value: v, label: s.option("shiftOk", v) }))}
              />
            )}
          />
        )}
      </FormField>
      <FormField
        id={`${id}-pay`}
        label={s.label("desiredPayMin")}
        labelSize="question"
        labelAddon={icon("blind")}
        help={s.help("desiredPayMin")}
        error={fieldError(e.desiredPayMin?.message)}
      >
        {(a11y) => (
          <NativeSelect {...a11y} {...form.register("desiredPayMin")}>
            <option value="">{tc("common.select.placeholder")}</option>
            {DESIRED_PAY_BANDS_KRW.map((v) => (
              <option key={v} value={String(v)}>
                {s.text("payFrom", {
                  amount: format.number(v, {
                    style: "currency",
                    currency: "KRW",
                    maximumFractionDigits: 0,
                  }),
                })}
              </option>
            ))}
            <option value={UNKNOWN}>{tc("seeker.register.common.unknown")}</option>
          </NativeSelect>
        )}
      </FormField>
      <FormField
        id={`${id}-group`}
        label={s.label("groupApply")}
        labelSize="question"
        labelAddon={icon("blind")}
        error={fieldError(e.groupApply?.message)}
      >
        {(a11y) => (
          <Controller
            control={form.control}
            name="groupApply"
            render={({ field }) => (
              <ChipGroup
                a11y={a11y}
                name="groupApply"
                value={field.value}
                onChange={field.onChange}
                options={yesNo}
              />
            )}
          />
        )}
      </FormField>
      {groupApply === "YES" ? (
        <FormField
          id={`${id}-friend`}
          label={s.label("groupFriendCode")}
          labelSize="question"
          labelAddon={icon("private")}
          help={s.help("groupFriendCode")}
          error={fieldError(e.groupFriendCode?.message)}
        >
          {(a11y) => (
            <Input {...a11y} autoCapitalize="characters" {...form.register("groupFriendCode")} />
          )}
        </FormField>
      ) : null}
      <WizardNav backHref={backHref} pending={pending} state={state}>
        <DisclosureSummary
          blind={[
            s.label("needDormitory"),
            s.label("shiftOk"),
            s.label("desiredPayMin"),
            s.label("groupApply"),
          ]}
          hidden={[s.label("groupFriendCode")]}
        />
      </WizardNav>
    </form>
  );
}

// ─── Step 6 비자 목표 ─────────────────────────────────────────────────────────

export function Step6Form({ values, reference, backHref }: Props<Step6Input>) {
  const s = useStepText("step6");
  const tc = useTranslations();
  const fieldError = useFieldError();
  const yesNo = useYesNo();
  const id = useId();
  const form = useForm<Step6Input>({ resolver: zodResolver(step6Schema), defaultValues: values });
  const { submit, pending, state } = useStepSubmit("6", form);
  const e = form.formState.errors;
  const wantsConsult = form.watch("wantsConsult");

  return (
    <form noValidate onSubmit={submit} className="grid gap-5.5" data-testid="wizard-step-6">
      <FormField
        id={`${id}-goal`}
        label={s.label("nextVisaGoal")}
        labelSize="question"
        labelAddon={icon("private")}
        help={s.help("nextVisaGoal")}
        error={fieldError(e.nextVisaGoal?.message)}
      >
        {(a11y) => (
          <NativeSelect {...a11y} {...form.register("nextVisaGoal")}>
            <option value="">{tc("common.select.placeholder")}</option>
            {reference.goals.map((g) => (
              <option key={g.code} value={g.code}>
                {[g.code, tc(g.nameKey)].join(" ")}
              </option>
            ))}
            <option value={UNKNOWN}>{tc("seeker.register.common.unknown")}</option>
          </NativeSelect>
        )}
      </FormField>
      <FormField
        id={`${id}-consult`}
        label={s.label("wantsConsult")}
        labelSize="question"
        labelAddon={icon("private")}
        help={s.help("wantsConsult")}
        error={fieldError(e.wantsConsult?.message)}
      >
        {(a11y) => (
          <Controller
            control={form.control}
            name="wantsConsult"
            render={({ field }) => (
              <ChipGroup
                a11y={a11y}
                name="wantsConsult"
                value={field.value}
                onChange={field.onChange}
                options={yesNo}
              />
            )}
          />
        )}
      </FormField>
      {wantsConsult === "YES" ? (
        <FormField
          id={`${id}-time`}
          label={s.label("consultTime")}
          labelSize="question"
          labelAddon={icon("private")}
          required
          error={fieldError(e.consultTime?.message)}
        >
          {(a11y) => (
            <Controller
              control={form.control}
              name="consultTime"
              render={({ field }) => (
                <MultiChips
                  a11y={a11y}
                  value={field.value}
                  onChange={field.onChange}
                  options={CONSULT_TIMES.map((v) => ({
                    value: v,
                    label: s.option("consultTime", v),
                  }))}
                />
              )}
            />
          )}
        </FormField>
      ) : null}
      <WizardNav backHref={backHref} pending={pending} state={state}>
        <DisclosureSummary
          blind={[]}
          hidden={[s.label("nextVisaGoal"), s.label("wantsConsult"), s.label("consultTime")]}
        />
      </WizardNav>
    </form>
  );
}

// ─── Step 7 동의와 완료 ───────────────────────────────────────────────────────

const CONSENT_FIELDS = [
  { type: "PRIVACY_REQUIRED", field: "privacyRequired" },
  { type: "BLIND_PROFILE", field: "blindProfile" },
  { type: "MARKETING", field: "marketing" },
  { type: "NOTICE", field: "notice" },
] as const satisfies ReadonlyArray<{ type: RegistrationConsent; field: keyof Step7Input }>;

/** One consent: checkbox row (44px+) with "(필수)"/"(선택)" + the draft body in a scroll box. */
export function ConsentRow({
  id,
  label,
  required,
  checked,
  onChange,
  error,
  document,
  testId,
}: {
  id: string;
  label: string;
  required: boolean;
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string;
  document?: ReactNode;
  testId: string;
}) {
  const t = useTranslations("common.form");
  const tr = useTranslations("seeker.register.step7");
  return (
    <div className="grid gap-2 rounded-md border border-n200 bg-white p-4" data-testid={testId}>
      <label
        htmlFor={id}
        className="flex min-h-11 cursor-pointer items-start gap-3 py-1 text-body text-navy"
      >
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(v) => onChange(v === true)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.75"
        />
        <span>
          {label}
          <span className="ms-1 text-n500">{required ? t("required") : tr("optional")}</span>
        </span>
      </label>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-caption text-error-text">
          {error}
        </p>
      ) : null}
      {document ? (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer items-center text-caption font-semibold text-brand-blue-700">
            {tr("readFull")}
          </summary>
          <div className="mt-2 max-h-60 overflow-y-auto rounded-sm border border-n200 bg-n50 p-3 text-dense text-n700">
            {document}
          </div>
        </details>
      ) : null}
    </div>
  );
}

export function Step7Form({
  values,
  reference,
  backHref,
  documents,
}: Props<Step7Input> & { documents: Partial<Record<RegistrationConsent, ReactNode>> }) {
  const s = useStepText("step7");
  const fieldError = useFieldError();
  const id = useId();
  const form = useForm<Step7Input>({
    resolver: zodResolver(step7SchemaFor(reference.blindProfileRequired)),
    defaultValues: values,
  });
  const { submit, pending, state } = useStepSubmit("7", form);
  const e = form.formState.errors;

  return (
    <form noValidate onSubmit={submit} className="grid gap-4" data-testid="wizard-step-7">
      {CONSENT_FIELDS.map(({ type, field }) => {
        const required =
          field === "privacyRequired" ||
          field === "notice" ||
          (field === "blindProfile" && reference.blindProfileRequired);
        return (
          <Controller
            key={type}
            control={form.control}
            name={field}
            render={({ field: f }) => (
              <ConsentRow
                id={`${id}-${field}`}
                label={s.label(field)}
                required={required}
                checked={f.value}
                onChange={f.onChange}
                error={fieldError(e[field]?.message)}
                document={documents[type]}
                testId={`consent-${type}`}
              />
            )}
          />
        );
      })}
      <WizardNav
        backHref={backHref}
        pending={pending}
        state={state}
        submitLabel={s.text("submit")}
      />
    </form>
  );
}
