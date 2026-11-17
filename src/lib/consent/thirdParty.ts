/**
 * THIRD_PARTY_INTERVIEW 건별 동의 (PRD R-211 v1.1, DECISIONS PC-1, WO §14 Phase 2, WO §11 동의 철회).
 *
 * - Asked per interview when staff confirm it (src/lib/recommendations/interviews.ts
 *   `confirmInterview`); answered by the seeker on /seeker/me.
 * - Agreeing writes one Consent row (type THIRD_PARTY_INTERVIEW, `interviewId`, current version,
 *   locale, agreedAt, ipHash) — the row is the record of the agreement. It clears an earlier
 *   decline (`Interview.consentDeclinedAt`).
 * - Declining sets `Interview.consentDeclinedAt`; when a consent was active it is revoked first.
 * - Revoking sets `revokedAt` (never deletes) and writes AuditLog CONSENT_REVOKE in the same
 *   transaction (BR-15). The company stops seeing the name at once: disclosure reads the consent on
 *   every request (src/lib/serializers/interviewDisclosure.ts).
 * - Only the seeker of the interview can answer, and only while the interview is CONFIRMED.
 * Seeker-facing data (`listInterviewConsentRequests`) carries no company name, address or contact
 * (BR-03): date, industry and 시·도 only.
 */
import { type Locale } from "@/i18n/locales";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { interviewEnded } from "@/lib/serializers/interviewDisclosure";
import { consentIpHash, currentConsentVersion } from "@/lib/seeker/consent";
import { INTERVIEW_CONSENT } from "@/lib/seeker/options";

type Client = typeof db;
type Tx = Parameters<Parameters<Client["$transaction"]>[0]>[0];

/** ENDED (P2c QA O-1, Q-25): a result was recorded or the interview was cancelled — nothing to answer. */
export type InterviewConsentState = "PENDING" | "AGREED" | "DECLINED" | "ENDED";

export type InterviewConsentRequest = {
  interviewId: string;
  scheduledAt: Date;
  industryCode: string;
  sido: string;
  state: InterviewConsentState;
  agreedAt: Date | null;
};

/**
 * Interviews of this seeker user that ask (or asked) for the consent: CONFIRMED, plus confirmed
 * then cancelled ones. An interview with a final result or cancelled is ENDED (Q-25): the screen
 * shows "면접 종료" and no answer buttons (P2c QA O-1).
 */
export async function listInterviewConsentRequests(
  userId: string,
  client: Client = db,
): Promise<InterviewConsentRequest[]> {
  const rows = await client.interview.findMany({
    where: {
      OR: [{ status: "CONFIRMED" }, { status: "CANCELLED", confirmedAt: { not: null } }],
      recommendation: { seeker: { userId } },
    },
    orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      status: true,
      result: true,
      scheduledAt: true,
      consentDeclinedAt: true,
      recommendation: {
        select: {
          company: { select: { industryCode: true, sido: true } },
          posting: { select: { industryCode: true, sido: true } },
        },
      },
      consents: {
        where: { type: INTERVIEW_CONSENT, revokedAt: null, userId },
        orderBy: { agreedAt: "desc" },
        take: 1,
        select: { agreedAt: true },
      },
    },
  });
  return rows.map((r) => {
    const place = r.recommendation.posting ?? r.recommendation.company;
    const agreed = r.consents[0]?.agreedAt ?? null;
    return {
      interviewId: r.id,
      scheduledAt: r.scheduledAt,
      industryCode: place.industryCode,
      sido: place.sido,
      state: interviewEnded(r)
        ? "ENDED"
        : agreed
          ? "AGREED"
          : r.consentDeclinedAt
            ? "DECLINED"
            : "PENDING",
      agreedAt: agreed,
    };
  });
}

export type InterviewConsentResult =
  { ok: true; changed: boolean } | { ok: false; code: "NOT_FOUND" | "INTERVIEW_STATE" };

/** The interview when it belongs to this seeker user (any status), else null. */
async function ownInterview(tx: Tx | Client, userId: string, interviewId: string) {
  if (typeof interviewId !== "string" || interviewId.length === 0 || interviewId.length > 64) {
    return null;
  }
  return tx.interview.findFirst({
    where: { id: interviewId, recommendation: { seeker: { userId } } },
    select: { id: true, status: true },
  });
}

export async function agreeInterviewConsent(
  args: { userId: string; interviewId: string; locale: Locale; ip: string | null; now?: Date },
  client: Client = db,
): Promise<InterviewConsentResult> {
  const now = args.now ?? new Date();
  return client.$transaction(async (tx) => {
    const iv = await ownInterview(tx, args.userId, args.interviewId);
    if (!iv) return { ok: false, code: "NOT_FOUND" };
    if (iv.status !== "CONFIRMED") return { ok: false, code: "INTERVIEW_STATE" };
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`consent:${iv.id}`}))`;
    const active = await tx.consent.findFirst({
      where: { userId: args.userId, type: INTERVIEW_CONSENT, interviewId: iv.id, revokedAt: null },
      select: { id: true },
    });
    if (active) return { ok: true, changed: false };
    await tx.consent.create({
      data: {
        userId: args.userId,
        type: INTERVIEW_CONSENT,
        version: currentConsentVersion(INTERVIEW_CONSENT),
        locale: args.locale,
        agreedAt: now,
        ipHash: consentIpHash(args.ip),
        interviewId: iv.id,
      },
    });
    await tx.interview.update({ where: { id: iv.id }, data: { consentDeclinedAt: null } });
    return { ok: true, changed: true };
  });
}

async function revokeActive(
  tx: Tx,
  args: { userId: string; interviewId: string; now: Date; reason: "REVOKE" | "DECLINE" },
): Promise<boolean> {
  const rows = await tx.consent.findMany({
    where: {
      userId: args.userId,
      type: INTERVIEW_CONSENT,
      interviewId: args.interviewId,
      revokedAt: null,
    },
    select: { id: true, version: true },
  });
  if (rows.length === 0) return false;
  await tx.consent.updateMany({
    where: { id: { in: rows.map((r) => r.id) } },
    data: { revokedAt: args.now },
  });
  await writeAudit(
    {
      actorId: args.userId,
      action: "CONSENT_REVOKE",
      entity: "Consent",
      entityId: rows[0].id,
      meta: {
        type: INTERVIEW_CONSENT,
        interviewId: args.interviewId,
        versions: rows.map((r) => r.version),
        count: rows.length,
        reason: args.reason,
      },
    },
    tx,
  );
  return true;
}

/** 동의 철회 (WO §11): the company stops seeing the name on its next request. */
export async function revokeInterviewConsent(
  args: { userId: string; interviewId: string; now?: Date },
  client: Client = db,
): Promise<InterviewConsentResult> {
  const now = args.now ?? new Date();
  return client.$transaction(async (tx) => {
    const iv = await ownInterview(tx, args.userId, args.interviewId);
    if (!iv) return { ok: false, code: "NOT_FOUND" };
    const changed = await revokeActive(tx, { ...args, now, reason: "REVOKE" });
    return { ok: true, changed };
  });
}

/** 거부: no name for this interview (an active consent is revoked first). */
export async function declineInterviewConsent(
  args: { userId: string; interviewId: string; now?: Date },
  client: Client = db,
): Promise<InterviewConsentResult> {
  const now = args.now ?? new Date();
  return client.$transaction(async (tx) => {
    const iv = await ownInterview(tx, args.userId, args.interviewId);
    if (!iv) return { ok: false, code: "NOT_FOUND" };
    if (iv.status !== "CONFIRMED") return { ok: false, code: "INTERVIEW_STATE" };
    await revokeActive(tx, { ...args, now, reason: "DECLINE" });
    await tx.interview.update({ where: { id: iv.id }, data: { consentDeclinedAt: now } });
    return { ok: true, changed: true };
  });
}
