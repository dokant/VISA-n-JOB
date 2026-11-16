"use client";

import type { ReactNode } from "react";

import { RadioChip, RadioGroup, chipClass } from "@/components/ui/radio-group";
import type { FieldA11y } from "@/components/forms/form-field";
import { cn } from "@/lib/utils";

export type ChipOption = { value: string; label: ReactNode };

/**
 * Single choice as chips (STANDARD 3.1 radio-group 칩형). `a11y` comes from FormField: the group
 * gets the field id, so the label's htmlFor and error description point at it.
 */
export function ChipGroup({
  a11y,
  options,
  value,
  onChange,
  name,
  testId,
}: {
  a11y: FieldA11y;
  options: readonly ChipOption[];
  value: string;
  onChange: (value: string) => void;
  name: string;
  testId?: string;
}) {
  return (
    <RadioGroup
      id={a11y.id}
      name={name}
      aria-labelledby={`${a11y.id}-label`}
      value={value}
      onValueChange={onChange}
      aria-invalid={a11y["aria-invalid"]}
      aria-describedby={a11y["aria-describedby"]}
      aria-required={a11y["aria-required"]}
      data-testid={testId}
    >
      {options.map((o) => (
        <RadioChip key={o.value} value={o.value} data-value={o.value}>
          {o.label}
        </RadioChip>
      ))}
    </RadioGroup>
  );
}

/** Multiple choice as toggle chips (`aria-pressed`), optional maximum. */
export function MultiChips({
  a11y,
  options,
  value,
  onChange,
  max,
  testId,
}: {
  a11y: FieldA11y;
  options: readonly ChipOption[];
  value: readonly string[];
  onChange: (value: string[]) => void;
  max?: number;
  testId?: string;
}) {
  const toggle = (v: string) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else if (max === undefined || value.length < max) onChange([...value, v]);
  };
  return (
    <div
      id={a11y.id}
      role="group"
      aria-labelledby={`${a11y.id}-label`}
      aria-describedby={a11y["aria-describedby"]}
      className="flex flex-wrap gap-2"
      data-testid={testId}
    >
      {options.map((o) => {
        const pressed = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={pressed}
            data-value={o.value}
            disabled={!pressed && max !== undefined && value.length >= max}
            onClick={() => toggle(o.value)}
            className={cn(chipClass)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
