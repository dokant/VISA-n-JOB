/**
 * Seeker consents (R-110, R-113, WO §7.3 Step 7).
 *
 * - Bodies live in `content/consents/{type}/{version}/{locale}.md` (not in messages). Every body is
 *   a draft marked [전문가 검토 필요] (N-03); non-Korean files carry the Korean original (SC-08).
 *   The current version of a type is the highest version folder.
 * - A Consent row stores type, version, locale, agreedAt and ipHash (HMAC of the client address,
 *   null when the address is not trusted — see rateLimit.clientIp).
 * - Revoking sets `revokedAt` (never deletes) and writes a CONSENT_REVOKE audit row in the same
 *   transaction (BR-15). BLIND_PROFILE revocation removes the seeker from employer candidate
 *   queries immediately (src/lib/candidates/eligible.ts, WO §15-8).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { type Locale, defaultLocale, locales } from "@/i18n/locales";
import { writeAudit } from "@/lib/audit";
import { hmacHash } from "@/lib/crypto";
import { db } from "@/lib/db";

import type { ConsentBodyType, RegistrationConsent, RevocableConsent } from "./options";

const CONSENT_DIR = path.join(process.cwd(), "content", "consents");

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/** "v2" > "v10" handled numerically. */
function versionNumber(v: string): number {
  const m = /^v([0-9]+)$/.exec(v);
  return m ? Number(m[1]) : -1;
}

/** Current version folder of a consent type (e.g. "v1"). Throws when the type has no body. */
export function currentConsentVersion(type: ConsentBodyType): string {
  const dir = path.join(CONSENT_DIR, type);
  const versions = existsSync(dir) ? readdirSync(dir).filter((v) => versionNumber(v) >= 0) : [];
  if (versions.length === 0) throw new Error(`consent body missing for ${type}`);
  return versions.sort((a, b) => versionNumber(b) - versionNumber(a))[0];
}

export type ConsentDocument = { type: ConsentBodyType; version: string; body: string };

/** Body of the current version in `locale` (Korean when the translation file is missing). */
export function getConsentDocument(type: ConsentBodyType, locale: string): ConsentDocument {
  const version = currentConsentVersion(type);
  const l = (locales as readonly string[]).includes(locale) ? locale : defaultLocale;
  const file = path.join(CONSENT_DIR, type, version, `${l}.md`);
  const fallback = path.join(CONSENT_DIR, type, version, `${defaultLocale}.md`);
  const body = readFileSync(existsSync(file) ? file : fallback, "utf8");
  return { type, version, body };
}

/** HMAC of the client address for Consent.ipHash; null when the address is unknown. */
export function consentIpHash(ip: string | null): string | null {
  return ip ? hmacHash(`consent-ip:${ip}`) : null;
}

/**
 * Records the given consents (skips a type that already has an active, unrevoked row).
 * Pass the transaction client of the registration so consents commit with the profile.
 */
export async function recordConsents(
  tx: Tx,
  args: {
    userId: string;
    types: readonly RegistrationConsent[];
    locale: Locale;
    ip: string | null;
    now: Date;
  },
): Promise<void> {
  const ipHash = consentIpHash(args.ip);
  for (const type of args.types) {
    const active = await tx.consent.findFirst({
      where: { userId: args.userId, type, revokedAt: null },
      select: { id: true },
    });
    if (active) continue;
    await tx.consent.create({
      data: {
        userId: args.userId,
        type,
        version: currentConsentVersion(type),
        locale: args.locale,
        agreedAt: args.now,
        ipHash,
      },
    });
  }
}

export type ActiveConsent = { type: string; version: string; locale: string; agreedAt: Date };

/** Unrevoked consents of a user, newest first. */
export async function activeConsents(userId: string): Promise<ActiveConsent[]> {
  return db.consent.findMany({
    where: { userId, revokedAt: null },
    orderBy: { agreedAt: "desc" },
    select: { type: true, version: true, locale: true, agreedAt: true },
  });
}

/**
 * R-113 동의 철회: revokes every active row of `type` and logs CONSENT_REVOKE (BR-15).
 * Returns false when nothing was active.
 */
export async function revokeConsent(args: {
  userId: string;
  type: RevocableConsent;
  now?: Date;
}): Promise<boolean> {
  const now = args.now ?? new Date();
  return db.$transaction(async (tx) => {
    const rows = await tx.consent.findMany({
      where: { userId: args.userId, type: args.type, revokedAt: null },
      select: { id: true, version: true },
    });
    if (rows.length === 0) return false;
    await tx.consent.updateMany({
      where: { id: { in: rows.map((r) => r.id) } },
      data: { revokedAt: now },
    });
    await writeAudit(
      {
        actorId: args.userId,
        action: "CONSENT_REVOKE",
        entity: "Consent",
        entityId: rows[0].id,
        meta: { type: args.type, versions: rows.map((r) => r.version), count: rows.length },
      },
      tx,
    );
    return true;
  });
}

/** Gives a revocable consent again (a new row with the current version). */
export async function grantConsent(args: {
  userId: string;
  type: RevocableConsent;
  locale: Locale;
  ip: string | null;
  now?: Date;
}): Promise<void> {
  const now = args.now ?? new Date();
  await db.$transaction((tx) =>
    recordConsents(tx, {
      userId: args.userId,
      types: [args.type],
      locale: args.locale,
      ip: args.ip,
      now,
    }),
  );
}
