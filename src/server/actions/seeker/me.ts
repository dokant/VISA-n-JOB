"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { type Locale, defaultLocale, locales } from "@/i18n/locales";
import {
  agreeInterviewConsent,
  declineInterviewConsent,
  revokeInterviewConsent,
} from "@/lib/consent/thirdParty";
import { db } from "@/lib/db";
import { clientIp } from "@/lib/rateLimit";
import { AuthzError } from "@/lib/rbac";
import { grantConsent, revokeConsent } from "@/lib/seeker/consent";
import { monthToDate } from "@/lib/seeker/options";
import { type SeekerActor, requireSeeker } from "@/lib/seeker/session";
import {
  consentChangeSchema,
  interviewConsentAnswerSchema,
  staySettingsSchema,
} from "@/schemas/seeker/me";

/**
 * /seeker/me actions (R-113). Without a seeker session they return `{ ok: false, code }`
 * (UNAUTHENTICATED / FORBIDDEN) instead of an unhandled server error (P2c QA O-5).
 */
export type MeActionState = { ok: true } | { ok: false; code: string };

function toLocale(value: unknown): Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value)
    ? (value as Locale)
    : defaultLocale;
}

/** 동의 철회 / 다시 동의 (BLIND_PROFILE, MARKETING). Revocation writes CONSENT_REVOKE (BR-15). */
export async function changeConsent(input: {
  type: string;
  action: "revoke" | "grant";
  locale: string;
}): Promise<MeActionState> {
  let actor: SeekerActor;
  try {
    actor = await requireSeeker(); // rbac: seeker:selfService (assertCan in requireSeeker)
  } catch (e) {
    if (e instanceof AuthzError) return { ok: false, code: e.code };
    throw e;
  }
  const parsed = consentChangeSchema.safeParse({ type: input.type });
  if (!parsed.success) return { ok: false, code: "VALIDATION" };
  if (input.action === "revoke") {
    await revokeConsent({ userId: actor.id, type: parsed.data.type });
  } else {
    await grantConsent({
      userId: actor.id,
      type: parsed.data.type,
      locale: toLocale(input.locale),
      ip: clientIp(await headers()),
    });
  }
  revalidatePath(`/${toLocale(input.locale)}/seeker/me`);
  return { ok: true };
}

/**
 * 면접 건별 동의 (R-211, PC-1): agree / decline / revoke THIRD_PARTY_INTERVIEW for one of the
 * seeker's own confirmed interviews. Revocation writes CONSENT_REVOKE (BR-15) and hides the name
 * from the company at once.
 */
export async function answerInterviewConsent(input: {
  interviewId: string;
  action: "agree" | "decline" | "revoke";
  locale: string;
}): Promise<MeActionState> {
  let actor: SeekerActor;
  try {
    actor = await requireSeeker(); // rbac: seeker:selfService (assertCan in requireSeeker)
  } catch (e) {
    if (e instanceof AuthzError) return { ok: false, code: e.code };
    throw e;
  }
  const parsed = interviewConsentAnswerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "VALIDATION" };
  const { interviewId, action } = parsed.data;
  const locale = toLocale(input.locale);
  const r =
    action === "agree"
      ? await agreeInterviewConsent({
          userId: actor.id,
          interviewId,
          locale,
          ip: clientIp(await headers()),
        })
      : action === "decline"
        ? await declineInterviewConsent({ userId: actor.id, interviewId })
        : await revokeInterviewConsent({ userId: actor.id, interviewId });
  if (!r.ok) return { ok: false, code: r.code };
  revalidatePath(`/${locale}/seeker/me`);
  return { ok: true };
}

/** /seeker/me/stay: stay expiry month + reminder opt-in (WO §6.2, §7.7). */
export async function saveStaySettings(input: unknown): Promise<MeActionState> {
  let actor: SeekerActor;
  try {
    actor = await requireSeeker(); // rbac: seeker:selfService (assertCan in requireSeeker)
  } catch (e) {
    if (e instanceof AuthzError) return { ok: false, code: e.code };
    throw e;
  }
  const parsed = staySettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "VALIDATION" };
  await db.seekerProfile.update({
    where: { userId: actor.id },
    data: {
      stayExpiry: monthToDate(parsed.data.stayExpiry),
      stayAlertOptIn: parsed.data.stayAlertOptIn,
    },
  });
  return { ok: true };
}
