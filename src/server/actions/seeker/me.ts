"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { type Locale, defaultLocale, locales } from "@/i18n/locales";
import { db } from "@/lib/db";
import { clientIp } from "@/lib/rateLimit";
import { grantConsent, revokeConsent } from "@/lib/seeker/consent";
import { monthToDate } from "@/lib/seeker/options";
import { requireSeeker } from "@/lib/seeker/session";
import { consentChangeSchema, staySettingsSchema } from "@/schemas/seeker/me";

/** /seeker/me actions (R-113). */
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
  const actor = await requireSeeker(); // rbac: seeker:selfService (assertCan in requireSeeker)
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

/** /seeker/me/stay: stay expiry month + reminder opt-in (WO §6.2, §7.7). */
export async function saveStaySettings(input: unknown): Promise<MeActionState> {
  const actor = await requireSeeker(); // rbac: seeker:selfService (assertCan in requireSeeker)
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
