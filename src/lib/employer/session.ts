/**
 * Employer session helpers for pages and server actions (STANDARD 4.5, same pattern as
 * src/lib/seeker/session.ts).
 *
 * `requireEmployer()` is the rbac check of the employer self-service actions (R-124 save, R-125):
 * it reads the Auth.js session, calls `assertCan(…, "employer:selfService")` and confirms in the
 * database that the account is still an EMPLOYER linked to a company.
 */
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AuthzError, assertCan, can } from "@/lib/rbac";

export type EmployerActor = { id: string; companyId: string };

async function employerOf(userId: string): Promise<EmployerActor | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, companyId: true },
  });
  return user?.role === "EMPLOYER" && user.companyId
    ? { id: userId, companyId: user.companyId }
    : null;
}

/** Throws AuthzError (401 / 403) unless the caller is a signed-in employer with a company. */
export async function requireEmployer(): Promise<EmployerActor> {
  const session = await auth();
  assertCan(session?.user, "employer:selfService");
  const actor = await employerOf(session?.user.id ?? "");
  if (!actor) throw new AuthzError("UNAUTHENTICATED", 401, "employer account not found");
  return actor;
}

/** Signed-in employer for pages, or null (no session, other role, or account gone). */
export async function currentEmployer(): Promise<EmployerActor | null> {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "employer:selfService")) return null;
  return employerOf(session.user.id);
}
