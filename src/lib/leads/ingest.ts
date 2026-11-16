/**
 * Job lead ingest (R-114, R-115, WO §8.1).
 *
 * - Idempotent on `sourceRef`: a second delivery of the same item updates the row, never adds one.
 * - Items whose `closesAt` is already past are rejected (`CLOSED`); so are items whose 시·도 cannot
 *   be matched with the Region table (`UNKNOWN_REGION`, JobLead.sido is required).
 * - KSIC section and 인구감소지역 flag come from the seed tables (tagging.ts).
 * - The original item is kept in `rawJson` only (never shown on public screens). Contact values are
 *   not kept there in plain text: the dedicated contact fields go to the encrypted `contact*Enc`
 *   columns and every other string inside `rawJson` passes `maskContacts` (STANDARD 4.7).
 * - Grades on re-ingest follow transitions.ts (`gradeOnReingest`): DO_NOT_CONTACT stays (R-115),
 *   ARCHIVED returns to C only when re-posted, B / A are untouched.
 */
import type { Prisma } from "@prisma/client";

import { SYSTEM_ACTOR } from "@/lib/audit";
import { db } from "@/lib/db";
import { phoneHashOf } from "@/lib/otp";
import { normalizePhone } from "@/lib/phone";
import { maskContacts } from "@/lib/pii-guard";
import { type IngestJobLead, ingestJobLeadSchema } from "@/schemas/ingest/jobLead";

import { type TaggingTables, loadTaggingTables, tagIndustry, tagRegion } from "./tagging";
import { gradeOnReingest, transitionLead } from "./transitions";

export type IngestRejectReason =
  "INVALID" | "CLOSED" | "UNKNOWN_REGION" | "DUPLICATE_IN_BATCH" | "RESERVED_SOURCE_REF";

export type IngestResult = {
  created: number;
  updated: number;
  rejected: Array<{ sourceRef: string | null; reason: IngestRejectReason }>;
};

/** sourceRef prefixes used by leads the app creates itself (R-124, R-125). */
export const RESERVED_SOURCE_REF_PREFIXES = ["DIAGNOSIS:", "REQUEST:"] as const;

export function isReservedSourceRef(ref: string): boolean {
  return RESERVED_SOURCE_REF_PREFIXES.some((p) => ref.toUpperCase().startsWith(p));
}

const CONTACT_KEYS = new Set(["contactName", "contactPhone", "contactEmail"]);

/** Original item for `rawJson`: contact fields dropped, contact-like text masked. */
export function sanitizeRaw(value: unknown, depth = 0): Prisma.InputJsonValue | null {
  if (depth > 8) return null;
  if (typeof value === "string") return maskContacts(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((v) => sanitizeRaw(v, depth + 1));
  if (value !== null && typeof value === "object") {
    const out: Record<string, Prisma.InputJsonValue | null> = {};
    for (const [k, v] of Object.entries(value)) {
      if (depth === 0 && CONTACT_KEYS.has(k)) continue;
      out[k] = sanitizeRaw(v, depth + 1);
    }
    return out as Prisma.InputJsonObject;
  }
  return null;
}

function refOf(raw: unknown): string | null {
  if (raw && typeof raw === "object" && "sourceRef" in raw) {
    const ref = (raw as { sourceRef: unknown }).sourceRef;
    return typeof ref === "string" && ref.trim() ? ref.trim().slice(0, 200) : null;
  }
  return null;
}

type Prepared = {
  item: IngestJobLead;
  data: Omit<Prisma.JobLeadUncheckedCreateInput, "grade">;
};

function prepare(
  raw: unknown,
  tables: TaggingTables,
  now: Date,
): Prepared | { reject: IngestRejectReason } {
  const parsed = ingestJobLeadSchema.safeParse(raw);
  if (!parsed.success) return { reject: "INVALID" };
  const item = parsed.data;
  if (isReservedSourceRef(item.sourceRef)) return { reject: "RESERVED_SOURCE_REF" };
  if (item.payMin != null && item.payMax != null && item.payMin > item.payMax) {
    return { reject: "INVALID" };
  }
  if (item.closesAt && item.closesAt.getTime() < now.getTime()) return { reject: "CLOSED" };
  const region = tagRegion(tables, item);
  if (!region) return { reject: "UNKNOWN_REGION" };

  const phone = item.contactPhone ? normalizePhone(item.contactPhone) : null;
  return {
    item,
    data: {
      source: item.source,
      sourceRef: item.sourceRef,
      companyName: item.companyName,
      bizRegNo: item.bizRegNo?.replace(/\D/g, "") || null,
      industryCode: tagIndustry(tables, item),
      sido: region.sido,
      sigungu: region.sigungu,
      depopulationArea: region.depopulationArea,
      title: item.title,
      payMin: item.payMin ?? null,
      payMax: item.payMax ?? null,
      postedAt: item.postedAt ?? null,
      closesAt: item.closesAt ?? null,
      foreignIntent: item.foreignIntent ?? null,
      rawJson: sanitizeRaw(raw) ?? {},
      contactNameEnc: item.contactName ?? null,
      contactPhoneEnc: phone,
      contactPhoneHash: phone ? phoneHashOf(phone) : null,
      contactEmailEnc: item.contactEmail ?? null,
    },
  };
}

type IngestClient = typeof db;

/** Validates, tags and upserts one batch (already checked to be an array of 1 ~ max items). */
export async function ingestJobLeads(
  items: readonly unknown[],
  now: Date = new Date(),
  client: IngestClient = db,
  tables?: TaggingTables,
): Promise<IngestResult> {
  const lookup = tables ?? (await loadTaggingTables(client));
  const result: IngestResult = { created: 0, updated: 0, rejected: [] };
  const seen = new Set<string>();

  for (const raw of items) {
    const prepared = prepare(raw, lookup, now);
    if ("reject" in prepared) {
      result.rejected.push({ sourceRef: refOf(raw), reason: prepared.reject });
      continue;
    }
    const { item, data } = prepared;
    if (seen.has(item.sourceRef)) {
      result.rejected.push({ sourceRef: item.sourceRef, reason: "DUPLICATE_IN_BATCH" });
      continue;
    }
    seen.add(item.sourceRef);

    const created = await client.$transaction(async (tx) => {
      const existing = await tx.jobLead.findUnique({
        where: { sourceRef: item.sourceRef },
        select: { id: true, grade: true, archivedAt: true },
      });
      if (!existing) {
        await tx.jobLead.create({ data: { ...data, grade: "C" } });
        return true;
      }
      const { sourceRef: _ref, ...update } = data;
      void _ref;
      // Contact values are only replaced when the source sends them again.
      const contact = item.contactName || item.contactPhone || item.contactEmail;
      const fields = contact
        ? update
        : {
            ...update,
            contactNameEnc: undefined,
            contactPhoneEnc: undefined,
            contactPhoneHash: undefined,
            contactEmailEnc: undefined,
          };
      const next = gradeOnReingest(existing, item);
      if (next !== existing.grade) {
        await transitionLead(tx, {
          leadId: existing.id,
          from: existing.grade,
          to: next,
          actorId: SYSTEM_ACTOR,
          reason: "INGEST_REPOSTED",
          now,
          data: fields,
        });
      } else {
        // grade untouched (R-115: DO_NOT_CONTACT never returns to C)
        await tx.jobLead.update({ where: { id: existing.id }, data: fields });
      }
      return false;
    });
    if (created) result.created += 1;
    else result.updated += 1;
  }
  return result;
}
