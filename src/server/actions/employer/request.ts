"use server";

import { RATE_LIMITS } from "@/config/limits";
import { submitJobRequest } from "@/lib/employer/jobRequest";
import { requireEmployer } from "@/lib/employer/session";
import { consumeRateLimit } from "@/lib/rateLimit";
import { AuthzError } from "@/lib/rbac";
import { type JobRequestInput, jobRequestSchema } from "@/schemas/employer/request";

export type JobRequestState =
  | { ok: true }
  | {
      ok: false;
      code:
        | "VALIDATION"
        | "CONTACT_INFO"
        | "INVALID_REFERENCE"
        | "RATE_LIMITED"
        | "UNAUTHENTICATED"
        | "UNKNOWN";
      /** Fields refused by pii-guard (BR-14) or failing validation. */
      fields?: string[];
    };

/** /[locale]/employer/request (R-125): signed-in employers only. */
export async function submitJobRequestAction(input: JobRequestInput): Promise<JobRequestState> {
  // rbac: employer:selfService — requireEmployer() is the first-statement check (STANDARD 4.5)
  const actor = await requireEmployer().catch((e: unknown) => {
    if (e instanceof AuthzError) return null;
    throw e;
  });
  if (!actor) return { ok: false, code: "UNAUTHENTICATED" };

  const parsed = jobRequestSchema.safeParse(input);
  if (!parsed.success) {
    const issues = parsed.error.issues;
    const contact = issues.filter((i) => i.message === "contactInfo");
    const fields = [...new Set(issues.map((i) => String(i.path[0])))];
    return contact.length > 0
      ? {
          ok: false,
          code: "CONTACT_INFO",
          fields: [...new Set(contact.map((i) => String(i.path[0])))],
        }
      : { ok: false, code: "VALIDATION", fields };
  }

  const limited = await consumeRateLimit(
    `jobRequest:company:${actor.companyId}`,
    RATE_LIMITS.jobRequestPerCompany,
  );
  if (!limited.ok) return { ok: false, code: "RATE_LIMITED" };

  try {
    const result = await submitJobRequest(actor, parsed.data);
    if (!result.ok) {
      return {
        ok: false,
        code: result.code === "NO_COMPANY" ? "UNAUTHENTICATED" : "INVALID_REFERENCE",
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, code: "UNKNOWN" };
  }
}
