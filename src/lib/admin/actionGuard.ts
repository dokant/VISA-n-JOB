/**
 * Admin server action wrapper (P1e QA O-3). The action body still starts with `requireStaff()` and
 * `assertCan(actor, "{권한}")` (STANDARD 4.5). When that check throws AuthzError, the wrapper returns a
 * plain refusal (`{ ok: false, code: "FORBIDDEN" | "UNAUTHENTICATED" }`) instead of an unhandled
 * server error. Nothing else is caught: redirects (`requireStaff`), validation results and real
 * failures behave as before. The body has not run past the check, so there is no data change and no
 * audit row.
 */
import { AuthzError } from "@/lib/rbac";

export type AuthzRefusal = { ok: false; code: AuthzError["code"] };

export function adminAction<Args extends unknown[], R>(
  body: (...args: Args) => Promise<R>,
): (...args: Args) => Promise<R | AuthzRefusal> {
  return async (...args: Args) => {
    try {
      return await body(...args);
    } catch (e) {
      if (e instanceof AuthzError) return { ok: false, code: e.code };
      throw e;
    }
  };
}
