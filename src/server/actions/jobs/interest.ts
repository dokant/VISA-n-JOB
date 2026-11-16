"use server";

import { isFeatureEnabled } from "@/config/flags";
import { type Locale, defaultLocale, locales } from "@/i18n/locales";
import { requestInterest } from "@/lib/postings/interest";
import { AuthzError, assertCan } from "@/lib/rbac";
import { requireSeeker } from "@/lib/seeker/session";
import { interestRequestSchema } from "@/schemas/jobs/interest";

/**
 * 면접 신청 (R-203). First statement `requireSeeker()` (signed-in SEEKER, STANDARD 4.5 B-7), next the
 * matrix check `interest:requestBySeeker`. A visitor without a seeker session gets
 * `UNAUTHENTICATED` and the screen sends them to 간편 등록 with `?next=` (the button is already a link
 * for them; this covers an expired session). Off while FEATURE_PUBLIC_JOBS is off (SC-07).
 */
export type InterestActionState =
  | { ok: true; already: boolean }
  | {
      ok: false;
      code: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "NOT_ELIGIBLE" | "BLOCKED" | "INVALID";
    }
  | null;

function toLocale(value: unknown): Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value)
    ? (value as Locale)
    : defaultLocale;
}

export async function requestInterestAction(
  _prev: InterestActionState,
  fd: FormData,
): Promise<InterestActionState> {
  let actor: { id: string };
  try {
    actor = await requireSeeker(); // rbac: seeker:selfService (signed-in seeker)
    assertCan("SEEKER", "interest:requestBySeeker");
  } catch (e) {
    if (e instanceof AuthzError) return { ok: false, code: e.code };
    throw e;
  }
  if (!isFeatureEnabled("FEATURE_PUBLIC_JOBS")) return { ok: false, code: "NOT_FOUND" };
  const parsed = interestRequestSchema.safeParse({ postingId: fd.get("postingId") });
  if (!parsed.success) return { ok: false, code: "INVALID" };
  const r = await requestInterest({
    userId: actor.id,
    postingId: parsed.data.postingId,
    locale: toLocale(fd.get("locale")),
  });
  if (r.ok) return { ok: true, already: r.already };
  // A seeker account without a profile row cannot be matched to a visa → consult guidance.
  if (r.code === "NO_PROFILE") return { ok: false, code: "NOT_ELIGIBLE" };
  return { ok: false, code: r.code };
}
