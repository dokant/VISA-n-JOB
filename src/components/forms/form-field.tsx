"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { Label } from "@/components/ui/label";

export type FieldA11y = {
  id: string;
  "aria-invalid": boolean | undefined;
  "aria-describedby": string | undefined;
  "aria-required": boolean | undefined;
};

type Props = {
  id: string;
  label: string;
  required?: boolean;
  help?: string;
  /** Already translated error text. */
  error?: string;
  /** Rendered after the label text (e.g. the DisclosureIcon of the wizard, SC-04). */
  labelAddon?: ReactNode;
  /** Label size: compact forms use text-label, wizard questions text-h3 (STANDARD 3.1). */
  labelSize?: "compact" | "question";
  children: (a11y: FieldA11y) => ReactNode;
};

/**
 * One labelled form field (STANDARD 3.1 form / 3.3): label + "(필수)" text, control, help, error
 * right under the control (`role="alert"`), 7px inside spacing. The control gets id / aria-* props.
 */
export function FormField({
  id,
  label,
  required,
  help,
  error,
  labelAddon,
  labelSize = "compact",
  children,
}: Props) {
  const t = useTranslations("common.form");
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="grid gap-1.75">
      <Label
        id={`${id}-label`}
        htmlFor={id}
        className={labelSize === "question" ? "text-h3 text-navy" : undefined}
      >
        {label}
        {required ? <span className="ms-1 font-normal text-n500">{t("required")}</span> : null}
        {labelAddon}
      </Label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        "aria-required": required || undefined,
      })}
      {error ? (
        <p id={errorId} role="alert" className="text-caption text-error-text">
          {error}
        </p>
      ) : null}
      {help ? (
        <p id={helpId} className="text-caption text-n500">
          {help}
        </p>
      ) : null}
    </div>
  );
}
