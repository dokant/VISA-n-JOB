"use server";

import { headers } from "next/headers";

import { RATE_LIMITS } from "@/config/limits";
import { type DiagnosisResult, runDiagnosis } from "@/lib/employer/diagnosis";
import { currentEmployer } from "@/lib/employer/session";
import { clientIp, consumeRateLimit, rateLimitSubject } from "@/lib/rateLimit";
import { type DiagnosisInput, diagnosisSchema } from "@/schemas/employer/diagnosis";

export type DiagnosisState =
  | { status: "ok"; result: DiagnosisResult }
  | { status: "error"; code: "VALIDATION" | "INVALID_REFERENCE" | "RATE_LIMITED" | "UNKNOWN" };

/** /[locale]/employer/diagnosis (R-124). The result is saved as a lead (source DIAGNOSIS). */
export async function submitDiagnosis(input: DiagnosisInput): Promise<DiagnosisState> {
  // rbac: public — 무료 채용 진단은 비로그인 공개 기능 (STANDARD 4.5 공개 예외, R-124). 로그인 기업이면 회사에 연결
  const parsed = diagnosisSchema.safeParse(input);
  if (!parsed.success) return { status: "error", code: "VALIDATION" };

  const ip = clientIp(await headers());
  if (ip) {
    const limited = await consumeRateLimit(
      `diagnosis:ip:${rateLimitSubject(ip)}`,
      RATE_LIMITS.diagnosisPerIp,
    );
    if (!limited.ok) return { status: "error", code: "RATE_LIMITED" };
  }

  try {
    const employer = await currentEmployer();
    const outcome = await runDiagnosis(parsed.data, {
      companyId: employer?.companyId ?? null,
      actorId: employer?.id ?? null,
    });
    if (!outcome.ok) return { status: "error", code: outcome.code };
    return { status: "ok", result: outcome.result };
  } catch {
    return { status: "error", code: "UNKNOWN" };
  }
}
