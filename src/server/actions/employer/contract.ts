"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { signEmployerContract } from "@/lib/employer/contract";
import { type EmployerActor, requireEmployer } from "@/lib/employer/session";
import { clientIp } from "@/lib/rateLimit";
import { AuthzError } from "@/lib/rbac";
import { type ContractSignInput, contractSignSchema } from "@/schemas/employer/contract";

/**
 * 기업 계약 동의 (R-208). First statement `requireEmployer()` (STANDARD 4.5 P-2,
 * employer:selfService). The terms box is required; `visaMandate` is optional and separate
 * (WO §9.4) — `false` still completes the contract.
 */
export type ContractState =
  | { ok: true; visaMandateAgreed: boolean }
  | {
      ok: false;
      code: "UNAUTHENTICATED" | "FORBIDDEN" | "TERMS_REQUIRED" | "ALREADY_SIGNED" | "INVALID";
    }
  | null;

export async function signContractAction(input: ContractSignInput): Promise<ContractState> {
  let actor: EmployerActor;
  try {
    actor = await requireEmployer(); // rbac: employer:selfService (signed-in employer)
  } catch (e) {
    if (e instanceof AuthzError) return { ok: false, code: e.code };
    throw e;
  }
  const parsed = contractSignSchema.safeParse(input);
  if (!parsed.success) {
    const terms = parsed.error.issues.some((i) => i.path[0] === "termsAgreed");
    return { ok: false, code: terms ? "TERMS_REQUIRED" : "INVALID" };
  }
  const r = await signEmployerContract({
    actor,
    termsAgreed: parsed.data.termsAgreed,
    visaMandate: parsed.data.visaMandate,
    locale: parsed.data.locale,
    ip: clientIp(await headers()),
  });
  if (!r.ok) {
    return { ok: false, code: r.code === "NO_COMPANY" ? "UNAUTHENTICATED" : r.code };
  }
  revalidatePath(`/${parsed.data.locale}/employer/contract`);
  return { ok: true, visaMandateAgreed: r.visaMandateAgreed };
}
