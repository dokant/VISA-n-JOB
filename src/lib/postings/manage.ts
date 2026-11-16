/**
 * 블라인드 공고 관리 (PRD R-201; WO §8.5, §15-4; BR-03, BR-04, BR-05, BR-15).
 *
 * Life cycle: DRAFT (created from a grade-A lead) → verified (verifiedBy / verifiedAt) → PUBLISHED
 * (POSTING_PUBLISH audit row) → CLOSED.
 * - Create: only from a lead whose grade is A (구인신청 + 직원 검증, BR-05). C·B·보관·재접촉금지 leads are
 *   refused here on the server (BR-04: C·B are never individual postings).
 * - The public text (blind title, 직무) is written by staff, never copied from the lead title or the
 *   company name: contact patterns are refused (pii-guard, BR-14) and so is any text that contains
 *   the lead's company name (BR-03).
 * - Verify: a DRAFT posting records who checked it and when. Verification can be redone while DRAFT.
 * - Publish: refused unless verifiedBy and verifiedAt are set (WO §15-4) and the lead is still A.
 *   The DB CHECK `JobPosting_published_requires_verification` is the backstop for direct writes.
 * - Close: DRAFT or PUBLISHED → CLOSED (the posting leaves the public list).
 *
 * JobPosting.companyId is required (WO §5). A lead that came from 구인 의뢰 already has its company;
 * a collected lead verified by phone has only a company name, so creating the posting also creates an
 * unverified Company row holding that name (encrypted `nameEnc`, no business number — the employer can
 * still sign up with it later) and links the lead to it.
 */
import { Prisma } from "@prisma/client";

import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { hasContacts } from "@/lib/pii-guard";
import type { PostingCreateInput } from "@/schemas/admin/postings";

type Client = typeof db;

/** AuditLog / error entity name of a blind posting (the Prisma model name). */
export const POSTING_ENTITY = Prisma.ModelName.JobPosting;

export type PostingActionError =
  | "NOT_FOUND"
  | "LEAD_NOT_FOUND"
  | "LEAD_NOT_A"
  | "TEXT_HAS_CONTACT"
  | "TEXT_HAS_COMPANY"
  | "UNKNOWN_REGION"
  | "UNKNOWN_INDUSTRY"
  | "UNKNOWN_VISA"
  | "NO_COMPANY"
  | "POSTING_STATE"
  | "NOT_VERIFIED"
  | "CONFLICT";

export type PostingActionResult<T = object> =
  ({ ok: true } & T) | { ok: false; code: PostingActionError };

const CORPORATE_MARKERS = /주식회사|유한회사|\(주\)|\(유\)|㈜|co\.?,?\s*ltd\.?|inc\.?|corp\.?/gi;

/**
 * P2a QA D-2: NFKC first (㈜ → (주), full-width letters), then invisible characters (Unicode Cf,
 * default-ignorable) and the corporate markers go, then everything that is not a letter, combining
 * mark or digit ("/ _ ~ * + = | \ :" spacing, punctuation) — "이투이/공고정밀" = "이투이공고정밀".
 */
function normalizeName(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[\p{Cf}\p{Default_Ignorable_Code_Point}]/gu, "")
    .replace(CORPORATE_MARKERS, "")
    .replace(/[^\p{L}\p{M}\p{N}]/gu, "")
    .toLowerCase();
}

/** True when `text` contains one of the company names (spacing, symbols, invisible characters and 주식회사·(주) ignored). */
export function containsCompanyName(text: string, names: ReadonlyArray<string | null>): boolean {
  const hay = normalizeName(text);
  return names.some((name) => {
    if (!name) return false;
    const needle = normalizeName(name);
    return needle.length >= 2 && hay.includes(needle);
  });
}

async function referenceProblem(
  client: Client,
  input: PostingCreateInput,
): Promise<PostingActionError | null> {
  const [sido, sigungu, industry, visas] = await Promise.all([
    client.region.findFirst({ where: { code: input.sido, level: "SIDO" }, select: { code: true } }),
    input.sigungu
      ? client.region.findFirst({
          where: { code: input.sigungu, level: "SIGUNGU", parentCode: input.sido },
          select: { code: true },
        })
      : Promise.resolve({ code: "" }),
    client.industry.findUnique({ where: { code: input.industryCode }, select: { code: true } }),
    client.visaType.findMany({
      where: { code: { in: input.eligibleVisas }, active: true, isStatusCode: true },
      select: { code: true },
    }),
  ]);
  if (!sido || !sigungu) return "UNKNOWN_REGION";
  if (!industry) return "UNKNOWN_INDUSTRY";
  if (visas.length !== new Set(input.eligibleVisas).size) return "UNKNOWN_VISA";
  return null;
}

/** R-201: creates a DRAFT posting from a grade-A lead. */
export async function createPostingFromLead(
  args: { actorId: string; input: PostingCreateInput },
  client: Client = db,
): Promise<PostingActionResult<{ postingId: string }>> {
  const { input } = args;
  const lead = await client.jobLead.findUnique({
    where: { id: input.leadId },
    select: {
      id: true,
      grade: true,
      companyId: true,
      companyName: true,
      company: { select: { nameEnc: true } },
    },
  });
  if (!lead) return { ok: false, code: "LEAD_NOT_FOUND" };
  if (lead.grade !== "A") return { ok: false, code: "LEAD_NOT_A" };

  const texts = [input.blindTitle, input.role];
  if (texts.some((t) => hasContacts(t))) return { ok: false, code: "TEXT_HAS_CONTACT" };
  const names = [lead.companyName, lead.company?.nameEnc ?? null];
  if (texts.some((t) => containsCompanyName(t, names))) {
    return { ok: false, code: "TEXT_HAS_COMPANY" };
  }
  const problem = await referenceProblem(client, input);
  if (problem) return { ok: false, code: problem };
  if (!lead.companyId && !lead.companyName) return { ok: false, code: "NO_COMPANY" };

  return client.$transaction(async (tx) => {
    // Re-read inside the transaction: the grade may have changed since the checks above.
    const current = await tx.jobLead.findUnique({
      where: { id: lead.id },
      select: { grade: true, companyId: true, companyName: true, sido: true, sigungu: true },
    });
    if (!current || current.grade !== "A") return { ok: false, code: "LEAD_NOT_A" } as const;

    let companyId = current.companyId;
    if (!companyId) {
      const company = await tx.company.create({
        data: {
          nameEnc: current.companyName ?? "",
          industryCode: input.industryCode,
          sido: current.sido,
          sigungu: current.sigungu,
        },
        select: { id: true },
      });
      companyId = company.id;
      await tx.jobLead.update({ where: { id: lead.id }, data: { companyId } });
    }

    const posting = await tx.jobPosting.create({
      data: {
        companyId,
        leadId: lead.id,
        blindTitle: input.blindTitle,
        role: input.role,
        industryCode: input.industryCode,
        sido: input.sido,
        sigungu: input.sigungu,
        payMin: input.payMin,
        payMax: input.payMax,
        overtimeNote: input.overtimeNote,
        dormitory: input.dormitory,
        meals: input.meals,
        shift: input.shift,
        headcount: input.headcount,
        eligibleVisas: [...new Set(input.eligibleVisas)],
        status: "DRAFT",
      },
      select: { id: true },
    });
    return { ok: true, postingId: posting.id } as const;
  });
}

/** R-201 / BR-05: staff verification of a DRAFT posting (records who and when). */
export async function verifyPosting(
  args: { actorId: string; postingId: string; now?: Date },
  client: Client = db,
): Promise<PostingActionResult> {
  const now = args.now ?? new Date();
  const posting = await client.jobPosting.findUnique({
    where: { id: args.postingId },
    select: { status: true, lead: { select: { grade: true } } },
  });
  if (!posting) return { ok: false, code: "NOT_FOUND" };
  if (posting.status !== "DRAFT") return { ok: false, code: "POSTING_STATE" };
  if (posting.lead?.grade !== "A") return { ok: false, code: "LEAD_NOT_A" };
  const { count } = await client.jobPosting.updateMany({
    where: { id: args.postingId, status: "DRAFT" },
    data: { verifiedBy: args.actorId, verifiedAt: now },
  });
  return count === 1 ? { ok: true } : { ok: false, code: "CONFLICT" };
}

/**
 * R-201 / WO §15-4: publishes a verified DRAFT posting and writes POSTING_PUBLISH (BR-15) in the same
 * transaction. Refused without verifiedBy / verifiedAt, or when the lead is no longer grade A.
 */
export async function publishPosting(
  args: { actorId: string; postingId: string; now?: Date },
  client: Client = db,
): Promise<PostingActionResult> {
  const now = args.now ?? new Date();
  return client.$transaction(async (tx) => {
    const posting = await tx.jobPosting.findUnique({
      where: { id: args.postingId },
      select: {
        status: true,
        verifiedAt: true,
        verifiedBy: true,
        leadId: true,
        lead: { select: { grade: true } },
      },
    });
    if (!posting) return { ok: false, code: "NOT_FOUND" } as const;
    if (posting.status !== "DRAFT") return { ok: false, code: "POSTING_STATE" } as const;
    if (!posting.verifiedAt || !posting.verifiedBy) {
      return { ok: false, code: "NOT_VERIFIED" } as const;
    }
    if (posting.lead?.grade !== "A") return { ok: false, code: "LEAD_NOT_A" } as const;
    const { count } = await tx.jobPosting.updateMany({
      where: {
        id: args.postingId,
        status: "DRAFT",
        verifiedAt: { not: null },
        verifiedBy: { not: null },
      },
      data: { status: "PUBLISHED", publishedAt: now },
    });
    if (count !== 1) return { ok: false, code: "CONFLICT" } as const;
    await writeAudit(
      {
        actorId: args.actorId,
        action: "POSTING_PUBLISH",
        entity: POSTING_ENTITY,
        entityId: args.postingId,
        meta: { leadId: posting.leadId, verifiedBy: posting.verifiedBy },
      },
      tx,
    );
    return { ok: true } as const;
  });
}

/** DRAFT / PUBLISHED → CLOSED (the posting leaves /jobs). */
export async function closePosting(
  args: { actorId: string; postingId: string; now?: Date },
  client: Client = db,
): Promise<PostingActionResult> {
  const now = args.now ?? new Date();
  const posting = await client.jobPosting.findUnique({
    where: { id: args.postingId },
    select: { status: true },
  });
  if (!posting) return { ok: false, code: "NOT_FOUND" };
  if (posting.status === "CLOSED") return { ok: false, code: "POSTING_STATE" };
  const { count } = await client.jobPosting.updateMany({
    where: { id: args.postingId, status: posting.status },
    data: { status: "CLOSED", closedAt: now },
  });
  return count === 1 ? { ok: true } : { ok: false, code: "CONFLICT" };
}

// ─── Admin reads ───────────────────────────────────────────────────────────────────────────

const ADMIN_POSTING_SELECT = {
  id: true,
  blindTitle: true,
  role: true,
  sido: true,
  sigungu: true,
  industryCode: true,
  payMin: true,
  payMax: true,
  overtimeNote: true,
  dormitory: true,
  meals: true,
  shift: true,
  headcount: true,
  eligibleVisas: true,
  status: true,
  verifiedBy: true,
  verifiedAt: true,
  publishedAt: true,
  closedAt: true,
  createdAt: true,
  leadId: true,
  lead: { select: { id: true, grade: true, title: true, companyName: true } },
  _count: { select: { interestRequests: true } },
} as const satisfies Prisma.JobPostingSelect;

export type AdminPosting = Prisma.JobPostingGetPayload<{ select: typeof ADMIN_POSTING_SELECT }>;

export function listAdminPostings(client: Client = db, take = 100): Promise<AdminPosting[]> {
  return client.jobPosting.findMany({
    select: ADMIN_POSTING_SELECT,
    orderBy: { createdAt: "desc" },
    take,
  });
}

export function getAdminPosting(id: string, client: Client = db): Promise<AdminPosting | null> {
  return client.jobPosting.findUnique({ where: { id }, select: ADMIN_POSTING_SELECT });
}

/** Grade-A leads (the only source of postings, BR-05) with their posting count. */
export function listPostableLeads(client: Client = db, take = 100) {
  return client.jobLead.findMany({
    where: { grade: "A" },
    orderBy: { updatedAt: "desc" },
    take,
    select: {
      id: true,
      title: true,
      companyName: true,
      sido: true,
      industryCode: true,
      updatedAt: true,
      _count: { select: { postings: true } },
    },
  });
}

/**
 * Lead values that may prefill a new posting: region, industry, pay and 채용 인원 only. The lead title
 * and company name are NOT offered as posting text (BR-03).
 */
export async function postingPrefill(leadId: string, client: Client = db) {
  const lead = await client.jobLead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      grade: true,
      title: true,
      companyName: true,
      sido: true,
      sigungu: true,
      industryCode: true,
      payMin: true,
      payMax: true,
      requestJson: true,
    },
  });
  if (!lead) return null;
  const request =
    lead.requestJson && typeof lead.requestJson === "object" && !Array.isArray(lead.requestJson)
      ? (lead.requestJson as Record<string, unknown>)
      : {};
  const headcount = typeof request.headcount === "number" ? request.headcount : null;
  return {
    lead: { id: lead.id, grade: lead.grade, title: lead.title, companyName: lead.companyName },
    values: {
      sido: lead.sido,
      sigungu: lead.sigungu,
      industryCode: lead.industryCode,
      payMin: lead.payMin,
      payMax: lead.payMax,
      headcount,
    },
  };
}
