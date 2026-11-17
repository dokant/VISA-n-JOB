/**
 * 구직자 검토 큐 (PRD R-120, R-122; WO §6.5, §7.6, §11; BR-06, BR-07, BR-15).
 *
 * 등급 (WO §7.6):
 * - B → A: 직원 상담 완료(`consultedAt`) + 체류자격 확인(`verifiedVisa`).
 * - A → S: A 조건 + 한국어 확인(`verifiedKorean`) + 구직 상태 ACTIVE + 최근 30일 내 상태 확인
 *   (`lastActiveConfirmedAt`, SEEKER_S_ACTIVE_CONFIRM_DAYS).
 * - 승격은 한 단계씩만(B → S 직행 없음). 내림(S → A, S·A → B)은 조건 없이 허용.
 * - 조건은 화면이 아니라 서버(이 모듈)에서 다시 검사하고, 저장은 조건을 `where`에 함께 넣은 조건부
 *   update로 해서 검사와 저장 사이에 값이 바뀌어도 조건 미충족 승격이 저장되지 않는다.
 * 확인 항목: 등급이 기대고 있는 확인(A·S의 상담·체류자격, S의 한국어)은 먼저 등급을 내려야 해제된다.
 * 트랙: BR-07 — 비자 유형 데이터(`VisaType.defaultTrack`)가 FUTURE_POOL인 구직자는 다른 트랙으로 바꿀
 *   수 없다(코드에 비자 목록을 두지 않는다, BR-12).
 * 모든 변경은 같은 트랜잭션에서 AuditLog 1행: SEEKER_GRADE_CHANGE / SEEKER_TRACK_CHANGE /
 *   SEEKER_REVIEW_UPDATE. meta에는 필드 이름과 등급·코드·참거짓·날짜만 담는다(평문 PII 없음).
 * 개인정보 열람(R-122): 복호 값은 `revealSeekerPii`로만 꺼내고, 꺼낼 때마다 PII_VIEW를 남긴다.
 *   목록·상세 조회 함수는 `…Enc` 필드를 select하지 않는다.
 */
import type { Prisma, SeekerGrade, SeekerStatus, SeekerTrack } from "@prisma/client";

import { SEEKER_S_ACTIVE_CONFIRM_DAYS } from "@/config/limits";
import { auditPiiView, writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";

const DAY_MS = 86_400_000;
const GRADE_RANK: Readonly<Record<SeekerGrade, number>> = { B: 0, A: 1, S: 2 };

export type GradeRequirement =
  | "CONSULTED" // 직원 상담 완료
  | "VERIFIED_VISA" // 체류자격 확인
  | "VERIFIED_KOREAN" // 한국어 확인
  | "ACTIVE" // 구직 상태 활성
  | "RECENT_CONFIRM"; // 최근 30일 내 상태 확인

export type GradeFacts = {
  grade: SeekerGrade;
  consultedAt: Date | null;
  verifiedVisa: boolean;
  verifiedKorean: boolean;
  status: SeekerStatus;
  lastActiveConfirmedAt: Date;
};

export function recentConfirmFrom(now: Date): Date {
  return new Date(now.getTime() - SEEKER_S_ACTIVE_CONFIRM_DAYS * DAY_MS);
}

/** Requirements of grade `to` (A or S) with whether each is met. B has none. */
export function gradeRequirements(
  facts: GradeFacts,
  to: SeekerGrade,
  now: Date,
): { key: GradeRequirement; met: boolean }[] {
  if (to === "B") return [];
  const a: { key: GradeRequirement; met: boolean }[] = [
    { key: "CONSULTED", met: facts.consultedAt != null },
    { key: "VERIFIED_VISA", met: facts.verifiedVisa },
  ];
  if (to === "A") return a;
  return [
    ...a,
    { key: "VERIFIED_KOREAN", met: facts.verifiedKorean },
    { key: "ACTIVE", met: facts.status === "ACTIVE" },
    {
      key: "RECENT_CONFIRM",
      met: facts.lastActiveConfirmedAt.getTime() >= recentConfirmFrom(now).getTime(),
    },
  ];
}

export type GradeChangeCheck =
  | { ok: true; direction: "UP" | "DOWN" }
  | { ok: false; code: "SAME_GRADE" | "GRADE_STEP" }
  | { ok: false; code: "REQUIREMENTS_UNMET"; missing: GradeRequirement[] };

export function checkGradeChange(facts: GradeFacts, to: SeekerGrade, now: Date): GradeChangeCheck {
  const diff = GRADE_RANK[to] - GRADE_RANK[facts.grade];
  if (diff === 0) return { ok: false, code: "SAME_GRADE" };
  if (diff < 0) return { ok: true, direction: "DOWN" };
  if (diff > 1) return { ok: false, code: "GRADE_STEP" };
  const missing = gradeRequirements(facts, to, now)
    .filter((r) => !r.met)
    .map((r) => r.key);
  return missing.length > 0
    ? { ok: false, code: "REQUIREMENTS_UNMET", missing }
    : { ok: true, direction: "UP" };
}

/** The same requirements as a `where` (guards the conditional update). */
function requirementsWhere(to: SeekerGrade, now: Date): Prisma.SeekerProfileWhereInput {
  if (to === "B") return {};
  const a: Prisma.SeekerProfileWhereInput = { consultedAt: { not: null }, verifiedVisa: true };
  if (to === "A") return a;
  return {
    ...a,
    verifiedKorean: true,
    status: "ACTIVE",
    lastActiveConfirmedAt: { gte: recentConfirmFrom(now) },
  };
}

const FACTS_SELECT = {
  grade: true,
  consultedAt: true,
  verifiedVisa: true,
  verifiedKorean: true,
  status: true,
  lastActiveConfirmedAt: true,
} as const;

export type ReviewError =
  | "NOT_FOUND"
  | "CONFLICT"
  | "SAME_GRADE"
  | "GRADE_STEP"
  | "REQUIREMENTS_UNMET"
  | "GRADE_DEPENDS"
  | "FUTURE_POOL_LOCKED"
  | "SAME_TRACK"
  | "UNKNOWN_VISA"
  | "NOTHING_TO_SAVE";

export type ReviewResult =
  { ok: true } | { ok: false; code: ReviewError; missing?: GradeRequirement[] };

type Client = typeof db;

/** R-120: grade change with the WO §7.6 checks. Writes SEEKER_GRADE_CHANGE. */
export async function changeSeekerGrade(
  args: { actorId: string; seekerId: string; to: SeekerGrade; now?: Date },
  client: Client = db,
): Promise<ReviewResult> {
  const now = args.now ?? new Date();
  return client.$transaction(async (tx) => {
    const facts = await tx.seekerProfile.findUnique({
      where: { id: args.seekerId },
      select: FACTS_SELECT,
    });
    if (!facts) return { ok: false, code: "NOT_FOUND" } as const;
    const check = checkGradeChange(facts, args.to, now);
    if (!check.ok) {
      return check.code === "REQUIREMENTS_UNMET"
        ? ({ ok: false, code: check.code, missing: check.missing } as const)
        : ({ ok: false, code: check.code } as const);
    }
    const guard = check.direction === "UP" ? requirementsWhere(args.to, now) : {};
    const { count } = await tx.seekerProfile.updateMany({
      where: { id: args.seekerId, grade: facts.grade, ...guard },
      data: { grade: args.to },
    });
    if (count === 0) return { ok: false, code: "CONFLICT" } as const;
    await writeAudit(
      {
        actorId: args.actorId,
        action: "SEEKER_GRADE_CHANGE",
        entity: "SeekerProfile",
        entityId: args.seekerId,
        meta: { from: facts.grade, to: args.to },
      },
      tx,
    );
    return { ok: true } as const;
  });
}

export type ReviewFlagsPatch = {
  consulted?: boolean;
  verifiedVisa?: boolean;
  verifiedKorean?: boolean;
};

/**
 * R-120: 상담 완료·체류자격 확인·한국어 확인 기록. Writes SEEKER_REVIEW_UPDATE with the changed
 * fields. A check the current grade depends on cannot be cleared (demote first).
 */
export async function updateReviewFlags(
  args: { actorId: string; seekerId: string; patch: ReviewFlagsPatch; now?: Date },
  client: Client = db,
): Promise<ReviewResult> {
  const now = args.now ?? new Date();
  return client.$transaction(async (tx) => {
    const cur = await tx.seekerProfile.findUnique({
      where: { id: args.seekerId },
      select: { grade: true, consultedAt: true, verifiedVisa: true, verifiedKorean: true },
    });
    if (!cur) return { ok: false, code: "NOT_FOUND" } as const;
    const { patch } = args;
    const rank = GRADE_RANK[cur.grade];
    const clearsA =
      (patch.consulted === false && cur.consultedAt != null) ||
      (patch.verifiedVisa === false && cur.verifiedVisa);
    const clearsS = patch.verifiedKorean === false && cur.verifiedKorean;
    if ((clearsA && rank >= GRADE_RANK.A) || (clearsS && rank >= GRADE_RANK.S)) {
      return { ok: false, code: "GRADE_DEPENDS" } as const;
    }

    const data: Prisma.SeekerProfileUpdateInput = {};
    const changes: Record<string, { from: boolean; to: boolean }> = {};
    if (patch.consulted !== undefined && patch.consulted !== (cur.consultedAt != null)) {
      data.consultedAt = patch.consulted ? now : null;
      changes.consultedAt = { from: cur.consultedAt != null, to: patch.consulted };
    }
    if (patch.verifiedVisa !== undefined && patch.verifiedVisa !== cur.verifiedVisa) {
      data.verifiedVisa = patch.verifiedVisa;
      changes.verifiedVisa = { from: cur.verifiedVisa, to: patch.verifiedVisa };
    }
    if (patch.verifiedKorean !== undefined && patch.verifiedKorean !== cur.verifiedKorean) {
      data.verifiedKorean = patch.verifiedKorean;
      changes.verifiedKorean = { from: cur.verifiedKorean, to: patch.verifiedKorean };
    }
    if (Object.keys(changes).length === 0) return { ok: false, code: "NOTHING_TO_SAVE" } as const;

    // Guard: the grade must not have moved since the read (the dependency check used it).
    const { count } = await tx.seekerProfile.updateMany({
      where: { id: args.seekerId, grade: cur.grade },
      data: data as Prisma.SeekerProfileUpdateManyMutationInput,
    });
    if (count === 0) return { ok: false, code: "CONFLICT" } as const;
    await writeAudit(
      {
        actorId: args.actorId,
        action: "SEEKER_REVIEW_UPDATE",
        entity: "SeekerProfile",
        entityId: args.seekerId,
        meta: { changes },
      },
      tx,
    );
    return { ok: true } as const;
  });
}

/** Codes a 전환 가능성 판정 may name: VisaType codes and their sub types (data, not code lists). */
export async function convertibleVisaOptions(client: Client = db): Promise<string[]> {
  const rows = await client.visaType.findMany({
    where: { active: true, isStatusCode: true },
    orderBy: { sortOrder: "asc" },
    select: { code: true, subTypes: true },
  });
  return rows.flatMap((r) => [r.code, ...r.subTypes]);
}

/** R-120: 전환 가능성 판정 입력 (convertibleVisa / convertibleAt). Writes SEEKER_REVIEW_UPDATE. */
export async function setConvertibility(
  args: {
    actorId: string;
    seekerId: string;
    convertibleVisa: string | null;
    convertibleAt: Date | null;
  },
  client: Client = db,
): Promise<ReviewResult> {
  if (args.convertibleVisa != null) {
    const options = await convertibleVisaOptions(client);
    if (!options.includes(args.convertibleVisa)) return { ok: false, code: "UNKNOWN_VISA" };
  }
  const convertibleAt = args.convertibleVisa == null ? null : args.convertibleAt;
  return client.$transaction(async (tx) => {
    const cur = await tx.seekerProfile.findUnique({
      where: { id: args.seekerId },
      select: { convertibleVisa: true, convertibleAt: true },
    });
    if (!cur) return { ok: false, code: "NOT_FOUND" } as const;
    const sameVisa = cur.convertibleVisa === args.convertibleVisa;
    const sameAt = (cur.convertibleAt?.getTime() ?? null) === (convertibleAt?.getTime() ?? null);
    if (sameVisa && sameAt) return { ok: false, code: "NOTHING_TO_SAVE" } as const;
    await tx.seekerProfile.update({
      where: { id: args.seekerId },
      data: { convertibleVisa: args.convertibleVisa, convertibleAt },
    });
    await writeAudit(
      {
        actorId: args.actorId,
        action: "SEEKER_REVIEW_UPDATE",
        entity: "SeekerProfile",
        entityId: args.seekerId,
        meta: {
          changes: {
            convertibleVisa: { from: cur.convertibleVisa, to: args.convertibleVisa },
            convertibleAt: {
              from: cur.convertibleAt?.toISOString() ?? null,
              to: convertibleAt?.toISOString() ?? null,
            },
          },
        },
      },
      tx,
    );
    return { ok: true } as const;
  });
}

/** R-120: 트랙 변경 with the BR-07 lock. Writes SEEKER_TRACK_CHANGE. */
export async function changeSeekerTrack(
  args: { actorId: string; seekerId: string; to: SeekerTrack },
  client: Client = db,
): Promise<ReviewResult> {
  return client.$transaction(async (tx) => {
    const cur = await tx.seekerProfile.findUnique({
      where: { id: args.seekerId },
      select: { track: true, visaCode: true },
    });
    if (!cur) return { ok: false, code: "NOT_FOUND" } as const;
    if (cur.track === args.to) return { ok: false, code: "SAME_TRACK" } as const;
    if (cur.visaCode) {
      const visa = await tx.visaType.findUnique({
        where: { code: cur.visaCode },
        select: { defaultTrack: true },
      });
      if (visa?.defaultTrack === "FUTURE_POOL" && args.to !== "FUTURE_POOL") {
        return { ok: false, code: "FUTURE_POOL_LOCKED" } as const;
      }
    }
    const { count } = await tx.seekerProfile.updateMany({
      where: { id: args.seekerId, track: cur.track },
      data: { track: args.to },
    });
    if (count === 0) return { ok: false, code: "CONFLICT" } as const;
    await writeAudit(
      {
        actorId: args.actorId,
        action: "SEEKER_TRACK_CHANGE",
        entity: "SeekerProfile",
        entityId: args.seekerId,
        meta: { from: cur.track, to: args.to },
      },
      tx,
    );
    return { ok: true } as const;
  });
}

// ─── Reading (no encrypted field leaves this module without PII_VIEW) ──────────────────────

/** Fields of the review list and detail. No `…Enc` field. */
export const SEEKER_REVIEW_SELECT = {
  id: true,
  publicId: true,
  nationality: true,
  birthYear: true,
  sido: true,
  visaCode: true,
  visaSubType: true,
  stayExpiry: true,
  koreanSpeaking: true,
  topikLevel: true,
  kiipStage: true,
  desiredIndustries: true,
  desiredRegions: true,
  jobSearchStatus: true,
  nextVisaGoal: true,
  wantsConsult: true,
  track: true,
  grade: true,
  needsVisaReview: true,
  verifiedVisa: true,
  verifiedKorean: true,
  consultedAt: true,
  convertibleVisa: true,
  convertibleAt: true,
  status: true,
  lastActiveConfirmedAt: true,
  /** R-213: open 30-day status check (null = none) and recorded no-shows (internal). */
  statusCheckSentAt: true,
  noShowCount: true,
  isQuickSignup: true,
  completedStep: true,
  messengerType: true,
  createdAt: true,
} as const satisfies Prisma.SeekerProfileSelect;

export type SeekerReviewRow = Prisma.SeekerProfileGetPayload<{
  select: typeof SEEKER_REVIEW_SELECT;
}>;

export const REVIEW_QUEUES = ["NEW", "B", "A", "S", "ALL"] as const;
export type ReviewQueue = (typeof REVIEW_QUEUES)[number];

export function reviewQueueWhere(queue: ReviewQueue): Prisma.SeekerProfileWhereInput {
  switch (queue) {
    case "NEW":
      return { grade: "B", consultedAt: null, status: { not: "BLOCKED" } };
    case "ALL":
      return {};
    default:
      return { grade: queue };
  }
}

export async function listSeekersForReview(
  queue: ReviewQueue,
  opts: { take: number; client?: Client },
): Promise<{ rows: SeekerReviewRow[]; total: number }> {
  const client = opts.client ?? db;
  const where = reviewQueueWhere(queue);
  const [rows, total] = await Promise.all([
    client.seekerProfile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: opts.take,
      select: SEEKER_REVIEW_SELECT,
    }),
    client.seekerProfile.count({ where }),
  ]);
  return { rows, total };
}

export async function getSeekerForReview(
  seekerId: string,
  client: Client = db,
): Promise<SeekerReviewRow | null> {
  return client.seekerProfile.findUnique({ where: { id: seekerId }, select: SEEKER_REVIEW_SELECT });
}

/**
 * 복호 필드 묶음. `basic` = 이름·학교·이전 직장명(seeker:view), `contact` = 전화·메신저 ID·이메일
 * (contact:view, WO §11: STAFF_VISA는 연락처를 볼 수 없다). The caller checks the permission.
 */
export const PII_GROUPS = {
  basic: ["legalNameEnc", "schoolNameEnc", "experiences.employerNameEnc"],
  contact: ["user.phoneEnc", "messengerIdEnc", "emailEnc"],
} as const;
export type PiiGroup = keyof typeof PII_GROUPS;

export type SeekerPiiValues =
  | { group: "basic"; legalName: string | null; schoolName: string | null; employerNames: string[] }
  | {
      group: "contact";
      phone: string | null;
      messengerType: string | null;
      messengerId: string | null;
      email: string | null;
    };

/** R-122: decrypts one group of fields and writes PII_VIEW (field names only) first. */
export async function revealSeekerPii(
  args: { actorId: string; seekerId: string; group: PiiGroup },
  client: Client = db,
): Promise<SeekerPiiValues | null> {
  const exists = await client.seekerProfile.findUnique({
    where: { id: args.seekerId },
    select: { id: true },
  });
  if (!exists) return null;
  await auditPiiView(
    {
      actorId: args.actorId,
      entity: "SeekerProfile",
      entityId: args.seekerId,
      fields: [...PII_GROUPS[args.group]],
    },
    client,
  );
  if (args.group === "basic") {
    const row = await client.seekerProfile.findUniqueOrThrow({
      where: { id: args.seekerId },
      select: {
        legalNameEnc: true,
        schoolNameEnc: true,
        experiences: { select: { employerNameEnc: true } },
      },
    });
    return {
      group: "basic",
      legalName: row.legalNameEnc,
      schoolName: row.schoolNameEnc,
      employerNames: row.experiences
        .map((e) => e.employerNameEnc)
        .filter((v): v is string => v != null && v !== ""),
    };
  }
  const row = await client.seekerProfile.findUniqueOrThrow({
    where: { id: args.seekerId },
    select: {
      messengerType: true,
      messengerIdEnc: true,
      emailEnc: true,
      user: { select: { phoneEnc: true } },
    },
  });
  return {
    group: "contact",
    phone: row.user.phoneEnc,
    messengerType: row.messengerType,
    messengerId: row.messengerIdEnc,
    email: row.emailEnc,
  };
}
