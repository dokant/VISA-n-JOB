/**
 * Seeker session helpers for pages and server actions (STANDARD 4.5).
 *
 * `requireSeeker()` is the rbac check of the seeker self-service actions: it reads the Auth.js
 * session, calls `assertCan(…, "seeker:selfService")` and confirms in the database that the account
 * still exists as a SEEKER. Pages use `currentSeekerId()` and redirect to the login when it is null.
 */
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AuthzError, assertCan, can } from "@/lib/rbac";

export type SeekerActor = { id: string };

/** Throws AuthzError (401 / 403) unless the caller is a signed-in seeker. */
export async function requireSeeker(): Promise<SeekerActor> {
  const session = await auth();
  assertCan(session?.user, "seeker:selfService");
  const id = session?.user.id ?? "";
  const user = await db.user.findUnique({ where: { id }, select: { role: true } });
  if (!user || user.role !== "SEEKER") {
    throw new AuthzError("UNAUTHENTICATED", 401, "seeker account not found");
  }
  return { id };
}

/** Signed-in seeker id for pages, or null (no session, other role, or account gone). */
export async function currentSeekerId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "seeker:selfService")) return null;
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  return user?.role === "SEEKER" ? session.user.id : null;
}
