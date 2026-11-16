"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { codeToKey } from "@/components/forms/error-key";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { OutcomeCard } from "@/components/visa/outcome-card";
import { DIAGNOSIS_FOREIGN_ROWS_MAX } from "@/config/limits";
import { Link } from "@/i18n/navigation";
import { type DiagnosisInput, diagnosisSchema } from "@/schemas/employer/diagnosis";
import { type DiagnosisState, submitDiagnosis } from "@/server/actions/employer/diagnosis";

type Option = { code: string; label: string };
type SigunguOption = { code: string; parentCode: string; nameKo: string };

type Props = {
  industries: Option[];
  sidos: Option[];
  sigungus: SigunguOption[];
  /** Visa options for "현재 외국인 고용 현황" (`{code} {name}` strings, STANDARD 3.2 VisaLabel ①). */
  visas: Option[];
};

/**
 * 무료 채용 진단 form + result (R-124, WO §9.1). The result comes only from the server
 * (evaluate.ts over PUBLISHED rules) and is shown with OutcomeCard — "참고용, 행정사 확인 필요" is
 * always on the card. One card per outcome + message lists the visas of that group.
 */
export function DiagnosisForm({ industries, sidos, sigungus, visas }: Props) {
  const t = useTranslations("employer.diagnosis");
  const tv = useTranslations("visa");
  const tc = useTranslations("common.select");
  const te = useTranslations("errors");
  const id = useId();
  const resultRef = useRef<HTMLHeadingElement>(null);
  const [state, setState] = useState<DiagnosisState | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<DiagnosisInput>({
    resolver: zodResolver(diagnosisSchema),
    defaultValues: {
      industryCode: "",
      sido: "",
      sigungu: "",
      regularEmployees: "",
      insuredDomestic: "",
      foreignWorkers: [],
    },
  });
  const rows = useFieldArray({ control: form.control, name: "foreignWorkers" });
  const { errors } = form.formState;
  const sido = form.watch("sido") as string;
  const sigunguOptions = sigungus.filter((g) => g.parentCode === sido);
  const fieldError = (code: string | undefined) =>
    code ? te(`field.${code}`, { max: DIAGNOSIS_FOREIGN_ROWS_MAX }) : undefined;

  useEffect(() => {
    if (state?.status === "ok") resultRef.current?.focus();
  }, [state]);

  const onSubmit = (values: DiagnosisInput) =>
    startTransition(async () => {
      setState(await submitDiagnosis(values));
    });

  const reset = () => {
    setState(null);
    form.reset();
  };

  if (state?.status === "ok") {
    return (
      <section
        className="grid gap-5"
        aria-labelledby={`${id}-result`}
        data-testid="diagnosis-result"
      >
        <div className="grid gap-2">
          <h2 id={`${id}-result`} ref={resultRef} tabIndex={-1} className="text-h2 text-navy">
            {t("result.title")}
          </h2>
          {state.result.needsReview ? (
            <p className="text-dense text-n700" data-testid="diagnosis-needs-review">
              {t("result.needsReview")}
            </p>
          ) : null}
          <p className="text-caption text-n500">{tv("outcomeReviewNote")}</p>
        </div>
        <div className="grid gap-4">
          {state.result.groups.map((g) => (
            <OutcomeCard
              key={`${g.outcome}-${g.messageKey}`}
              outcome={g.outcome}
              visas={g.visas}
              messageKey={g.messageKey}
            />
          ))}
        </div>
        <p className="text-dense text-n700">{t("result.saved")}</p>
        <div className="grid gap-3 sm:flex sm:flex-wrap">
          <Button asChild variant="brand">
            <Link href="/employer/request">
              {t("result.request")}
              <ArrowRight aria-hidden="true" strokeWidth={1.5} data-icon="trailing" />
            </Link>
          </Button>
          <Button type="button" variant="outline" onClick={reset}>
            <RotateCcw aria-hidden="true" strokeWidth={1.5} />
            {t("result.again")}
          </Button>
        </div>
      </section>
    );
  }

  const serverError =
    state?.status === "error"
      ? te.has(`employer.${codeToKey(state.code)}`)
        ? te(`employer.${codeToKey(state.code)}`)
        : te("employer.unknown")
      : null;

  return (
    <form
      noValidate
      className="grid gap-5.5"
      data-testid="diagnosis-form"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <FormField
        id={`${id}-industry`}
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
      <div className="grid gap-5.5 sm:grid-cols-2">
        <FormField
          id={`${id}-sido`}
          label={t("sido.label")}
          required
          error={fieldError(errors.sido?.message)}
        >
          {(a11y) => (
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
          )}
        </FormField>
        <FormField
          id={`${id}-sigungu`}
          label={t("sigungu.label")}
          required
          error={fieldError(errors.sigungu?.message)}
        >
          {(a11y) => (
            <NativeSelect {...a11y} disabled={!sido} {...form.register("sigungu")}>
              <option value="">{sido ? tc("placeholder") : t("sigungu.placeholder")}</option>
              {sigunguOptions.map((g) => (
                <option key={g.code} value={g.code}>
                  {g.nameKo}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
      </div>
      <div className="grid gap-5.5 sm:grid-cols-2">
        <FormField
          id={`${id}-regular`}
          label={t("regularEmployees.label")}
          required
          help={t("regularEmployees.help")}
          error={fieldError(errors.regularEmployees?.message)}
        >
          {(a11y) => <Input {...a11y} inputMode="numeric" {...form.register("regularEmployees")} />}
        </FormField>
        <FormField
          id={`${id}-insured`}
          label={t("insuredDomestic.label")}
          required
          help={t("insuredDomestic.help")}
          error={fieldError(errors.insuredDomestic?.message)}
        >
          {(a11y) => <Input {...a11y} inputMode="numeric" {...form.register("insuredDomestic")} />}
        </FormField>
      </div>

      <fieldset className="grid gap-3" data-testid="diagnosis-foreign">
        <legend className="mb-1.75 text-label text-n700">{t("foreignWorkers.label")}</legend>
        <p className="text-caption text-n500">{t("foreignWorkers.help")}</p>
        {rows.fields.map((row, i) => {
          const rowErrors = errors.foreignWorkers?.[i];
          return (
            <div
              key={row.id}
              role="group"
              aria-label={t("foreignWorkers.row", { n: i + 1 })}
              className="grid gap-3 rounded-sm border border-n200 bg-n50 p-3 sm:flex sm:items-end"
            >
              <div className="sm:flex-1">
                <FormField
                  id={`${id}-fw-${i}-visa`}
                  label={t("foreignWorkers.visa")}
                  required
                  error={fieldError(rowErrors?.visaCode?.message)}
                >
                  {(a11y) => (
                    <NativeSelect {...a11y} {...form.register(`foreignWorkers.${i}.visaCode`)}>
                      <option value="">{tc("placeholder")}</option>
                      {visas.map((v) => (
                        <option key={v.code} value={v.code}>
                          {v.label}
                        </option>
                      ))}
                    </NativeSelect>
                  )}
                </FormField>
              </div>
              <div className="sm:w-32">
                <FormField
                  id={`${id}-fw-${i}-count`}
                  label={t("foreignWorkers.count")}
                  required
                  error={fieldError(rowErrors?.count?.message)}
                >
                  {(a11y) => (
                    <Input
                      {...a11y}
                      inputMode="numeric"
                      {...form.register(`foreignWorkers.${i}.count`)}
                    />
                  )}
                </FormField>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="justify-self-start"
                onClick={() => rows.remove(i)}
                aria-label={`${t("foreignWorkers.remove")} (${t("foreignWorkers.row", { n: i + 1 })})`}
              >
                <Trash2 aria-hidden="true" strokeWidth={1.5} />
                <span className="sm:sr-only">{t("foreignWorkers.remove")}</span>
              </Button>
            </div>
          );
        })}
        {rows.fields.length < DIAGNOSIS_FOREIGN_ROWS_MAX ? (
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-fit"
            onClick={() => rows.append({ visaCode: "", count: "" })}
            data-testid="diagnosis-add-visa"
          >
            <Plus aria-hidden="true" strokeWidth={1.5} />
            {t("foreignWorkers.add")}
          </Button>
        ) : null}
      </fieldset>

      {serverError ? (
        <p role="alert" className="text-caption text-error-text" data-testid="diagnosis-error">
          {serverError}
        </p>
      ) : null}
      <Button type="submit" variant="brand" className="w-full" disabled={pending}>
        <Search aria-hidden="true" strokeWidth={1.5} />
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
