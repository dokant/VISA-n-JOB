"use server";

import type { Outcome } from "@prisma/client";

import { db } from "@/lib/db";
import { evaluate } from "@/lib/visa-engine/evaluate";
import { visaCheckSchema } from "@/schemas/visa/visaCheck";

export type VisaCheckState =
  | { status: "idle" }
  | { status: "invalid" }
  | { status: "error" }
  | {
      status: "ok";
      outcome: Outcome;
      messageKey: string;
      visa: { code: string; nameKey: string };
    };

/** Runs the visa check for the given reference codes (shared by the action and server pages). */
export async function runVisaCheck(raw: {
  visaCode?: unknown;
  sido?: unknown;
  industryCode?: unknown;
}): Promise<VisaCheckState> {
  // rbac: public — 비자 진단은 비로그인 공개 기능 (STANDARD 4.5 공개 예외, R-126)
  const parsed = visaCheckSchema.safeParse(raw);
  if (!parsed.success) return { status: "invalid" };
  const { visaCode, sido, industryCode } = parsed.data;

  const [visa, region, industry] = await Promise.all([
    db.visaType.findFirst({ where: { code: visaCode, active: true } }),
    sido ? db.region.findFirst({ where: { code: sido, level: "SIDO" } }) : null,
    industryCode ? db.industry.findUnique({ where: { code: industryCode } }) : null,
  ]);
  if (!visa) return { status: "invalid" };

  const result = await evaluate({
    visaCode: visa.code,
    sido: region?.code ?? null,
    industryCode: industry?.code ?? null,
  });
  return {
    status: "ok",
    outcome: result.outcome,
    messageKey: result.messageKey,
    visa: { code: visa.code, nameKey: visa.nameKey },
  };
}

/** Server action for the visa check forms (home widget, /visa-check). */
export async function evaluateVisaAction(
  _prev: VisaCheckState,
  formData: FormData,
): Promise<VisaCheckState> {
  // rbac: public — 비자 진단은 비로그인 공개 기능 (STANDARD 4.5 공개 예외, R-126)
  try {
    return await runVisaCheck({
      visaCode: formData.get("visaCode") ?? undefined,
      sido: formData.get("sido") ?? undefined,
      industryCode: formData.get("industryCode") ?? undefined,
    });
  } catch {
    return { status: "error" };
  }
}
