import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Link } from "@/i18n/navigation";
import { SKILLS } from "@/lib/seeker/options";
import {
  type CandidateFilterKey,
  type CandidateFilters,
  DORMITORY_FILTER_VALUES,
  SHIFT_FILTER_VALUES,
  TOPIK_FILTER_LEVELS,
} from "@/schemas/employer/candidates";

import type { Option } from "./candidate-view";

/**
 * WO §9.3 필터 8종 (R-205) as a plain GET form (native selects, works without JavaScript,
 * STANDARD 3.1 native-select). The server reads the same keys (`parseCandidateFilters`).
 */
export function CandidateFiltersForm({
  values,
  visaOptions,
  stayOptions,
  industryOptions,
}: {
  values: CandidateFilters;
  visaOptions: Option[];
  stayOptions: Option[];
  industryOptions: Option[];
}) {
  const t = useTranslations("employer.candidates.filters");
  const tr = useTranslations("seeker.register");
  const tc = useTranslations("employer.candidates.card");

  const fields: { key: CandidateFilterKey; label: string; options: Option[] }[] = [
    { key: "visa", label: t("visa"), options: visaOptions },
    { key: "stay", label: t("stay"), options: stayOptions },
    {
      key: "topik",
      label: t("topik"),
      options: TOPIK_FILTER_LEVELS.map((l) => ({ value: l, label: t("topikMin", { level: l }) })),
    },
    { key: "industry", label: t("industry"), options: industryOptions },
    {
      key: "skill",
      label: t("skill"),
      options: SKILLS.map((s) => ({ value: s, label: tr(`step4.skills.option.${s}`) })),
    },
    {
      key: "dormitory",
      label: t("dormitory"),
      options: DORMITORY_FILTER_VALUES.map((v) => ({
        value: v,
        label: v === "YES" ? tc("yes") : tc("no"),
      })),
    },
    {
      key: "shift",
      label: t("shift"),
      options: SHIFT_FILTER_VALUES.map((v) => ({
        value: v,
        label: tr(`step5.shiftOk.option.${v}`),
      })),
    },
    { key: "convertible", label: t("convertible"), options: visaOptions },
  ];

  return (
    <form
      method="get"
      className="grid gap-5 rounded-md border border-border bg-white p-6 shadow-1"
      data-testid="candidate-filters"
      aria-label={t("title")}
    >
      <h2 className="text-h3 text-navy">{t("title")}</h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map((f) => (
          <div key={f.key} className="grid content-start gap-1.75">
            <Label htmlFor={`filter-${f.key}`}>{f.label}</Label>
            <NativeSelect id={`filter-${f.key}`} name={f.key} defaultValue={values[f.key]}>
              <option value="">{t("any")}</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" data-testid="filters-submit">
          {t("submit")}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/employer/candidates">{t("reset")}</Link>
        </Button>
      </div>
    </form>
  );
}
