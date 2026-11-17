"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Ref } from "react";

import type { FieldA11y } from "@/components/forms/form-field";
import { NativeSelect } from "@/components/ui/native-select";
import { formatMonthName } from "@/i18n/dateTime";

/**
 * Month picker = year select + month select (STANDARD 3.1: no calendar). Value "YYYY-MM" or "".
 * Month names come from the common date formatter (src/i18n/dateTime.ts, `Intl`).
 */
export function MonthSelect({
  a11y,
  value,
  onChange,
  fromYear,
  toYear,
  name,
  ref,
}: {
  /** react-hook-form `field.ref`: the year select receives focus on an error (STANDARD 3.3). */
  ref?: Ref<HTMLSelectElement>;
  a11y: FieldA11y;
  value: string;
  onChange: (value: string) => void;
  fromYear: number;
  toYear: number;
  name: string;
}) {
  const t = useTranslations("seeker.register.common");
  const locale = useLocale();
  const [year = "", month = ""] = value ? value.split("-") : [];
  const years: number[] = [];
  const step = fromYear <= toYear ? 1 : -1;
  for (let y = fromYear; step > 0 ? y <= toYear : y >= toYear; y += step) years.push(y);

  const emit = (y: string, m: string) => onChange(y && m ? `${y}-${m}` : y || m ? `${y}-${m}` : "");

  return (
    <div className="grid grid-cols-2 gap-2">
      <NativeSelect
        {...a11y}
        ref={ref}
        name={`${name}-year`}
        aria-label={t("year")}
        value={year}
        onChange={(e) => emit(e.target.value, month)}
      >
        <option value="">{t("year")}</option>
        {years.map((y) => (
          <option key={y} value={String(y)}>
            {y}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        id={`${a11y.id}-month`}
        name={`${name}-month`}
        aria-label={t("month")}
        aria-invalid={a11y["aria-invalid"]}
        aria-describedby={a11y["aria-describedby"]}
        value={month}
        onChange={(e) => emit(year, e.target.value)}
      >
        <option value="">{t("month")}</option>
        {Array.from({ length: 12 }, (_, i) => {
          const m = String(i + 1).padStart(2, "0");
          return (
            <option key={m} value={m}>
              {formatMonthName(locale, i)}
            </option>
          );
        })}
      </NativeSelect>
    </div>
  );
}
