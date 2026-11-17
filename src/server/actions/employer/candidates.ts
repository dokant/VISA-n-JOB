"use server";

import { isFeatureEnabled } from "@/config/flags";
import { type Locale, defaultLocale, locales } from "@/i18n/locales";
import { requestCandidateInterview } from "@/lib/candidates/interest";
import { type EmployerActor, requireEmployer } from "@/lib/employer/session";
import { AuthzError, assertCan } from "@/lib/rbac";
import { candidateInterviewSchema } from "@/schemas/employer/candidates";

/**
 * 면접 요청 (R-207). First statement `requireEmployer()` (signed-in EMPLOYER with a company,
 * STANDARD 4.5 P-2), next the matrix check `interest:requestByEmployer`. Off while
 * FEATURE_EMPLOYER_CANDIDATES is off (SC-07). The result never carries seeker data (R-206).
 */
export type CandidateInterviewState =
  | { ok: true; already: boolean }
  | {
      ok: false;
      code: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "NOT_CONTRACTED" | "INVALID";
    }
  | null;

function toLocale(value: unknown): Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value)
    ? (value as Locale)
    : defaultLocale;
}

export async function requestCandidateInterviewAction(
  _prev: CandidateInterviewState,
  fd: FormData,
): Promise<CandidateInterviewState> {
  let actor: EmployerActor;
  try {
    actor = await requireEmployer(); // rbac: employer:selfService (signed-in employer)
    assertCan("EMPLOYER", "interest:requestByEmployer");
  } catch (e) {
    if (e instanceof AuthzError) return { ok: false, code: e.code };
    throw e;
  }
  if (!isFeatureEnabled("FEATURE_EMPLOYER_CANDIDATES")) return { ok: false, code: "NOT_FOUND" };
  const parsed = candidateInterviewSchema.safeParse({ publicId: fd.get("publicId") });
  if (!parsed.success) return { ok: false, code: "INVALID" };
  const r = await requestCandidateInterview({
    actor,
    publicId: parsed.data.publicId,
    locale: toLocale(fd.get("locale")),
  });
  return r.ok ? { ok: true, already: r.already } : { ok: false, code: r.code };
}
