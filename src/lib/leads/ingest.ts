/**
 * Job lead ingest (R-114, R-115, WO §8.1).
 *
 * - Idempotent on `sourceRef`: a second delivery of the same item updates the row, never adds one.
 * - Items whose `closesAt` is already past are rejected (`CLOSED`); so are items whose 시·도 cannot
 *   be matched with the Region table (`UNKNOWN_REGION`, JobLead.sido is required).
 * - KSIC section and 인구감소지역 flag come from the seed tables (tagging.ts).
 * - Contact values are never kept in plain text outside the encrypted `contact*Enc` columns
 *   (STANDARD 4.7, P1d QA O-1):
 *   - the text columns stored from the item (`title`, `companyName`) pass `maskContacts`; the
 *     company name itself stays, only contact-like spans are replaced;
 *   - `rawJson` keeps the original item without the dedicated contact fields; every string passes
 *     `maskContacts`, and values under contact-like keys (tel, phone, fax, contact …) or numbers
 *     shaped like a phone number are replaced as a whole.
 * - Grades on re-ingest follow transitions.ts (`gradeOnReingest`): DO_NOT_CONTACT stays (R-115),
 *   ARCHIVED returns to C only when re-posted, B / A are untouched.
 * - Fields on re-ingest follow the "re-ingest field rules" in transitions.ts (P1d QA O-2): a key the
 *   item does not carry keeps the stored value; a key sent as null (or blank text) clears it.
 */
import type { Prisma } from "@prisma/client";

import { SYSTEM_ACTOR } from "@/lib/audit";
import { db } from "@/lib/db";
import { phoneHashOf } from "@/lib/otp";
import { normalizePhone } from "@/lib/phone";
import { hasContacts, maskContacts } from "@/lib/pii-guard";
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

/** Dedicated contact fields of the item: stored encrypted only, dropped from rawJson. */
const CONTACT_KEYS = new Set(["contactName", "contactPhone", "contactEmail"]);

/** Replacement for a value masked as a whole (same text as maskContacts uses). */
const MASK = "***";

/** Words that mark a rawJson key as holding contact details (camelCase / snake_case parts). */
const CONTACT_KEY_WORDS = new Set([
  "tel",
  "telno",
  "phone",
  "phoneno",
  "fax",
  "mobile",
  "cell",
  "cellphone",
  "hp",
  "contact",
  "email",
  "mail",
  "kakao",
  "katalk",
  "zalo",
  "telegram",
  "wechat",
  "whatsapp",
  "messenger",
]);
/** Korean key parts that mark a contact key ("연락처", "전화번호", "담당자" …). */
const CONTACT_KEY_KO = /연락|전화|휴대|핸드폰|팩스|메일|카톡|담당자/;

/** True when a rawJson key names contact details (`tel`, `hpNo`, `contact_phone`, `연락처` …). */
export function isContactKey(key: string): boolean {
  if (CONTACT_KEY_KO.test(key)) return true;
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return words.some((w) => CONTACT_KEY_WORDS.has(w));
}

/**
 * True when a JSON number reads as a phone number. JSON numbers lose the leading 0
 * (010-9876-5432 → 1098765432), so 9 ~ 10 digit integers are also checked with the 0 put back.
 */
export function isPhoneShapedNumber(value: number): boolean {
  if (!Number.isSafeInteger(value) || value <= 0) return false;
  const digits = String(value);
  if (hasContacts(digits)) return true;
  return digits.length >= 9 && digits.length <= 10 && hasContacts(`0${digits}`);
}

/** Top-level numeric fields of the schema (pay) that are business values, never phone numbers. */
const NUMERIC_FIELDS = new Set(["payMin", "payMax"]);

/** Original item for `rawJson`: contact fields dropped, contact-like values masked. */
export function sanitizeRaw(
  value: unknown,
  depth = 0,
  key = "",
  underContactKey = false,
): Prisma.InputJsonValue | null {
  if (depth > 8) return null;
  const contactKey = underContactKey || (key !== "" && isContactKey(key));
  if (typeof value === "string") {
    if (contactKey) return value.trim() ? MASK : value;
    return maskContacts(value);
  }
  if (typeof value === "number") {
    if (contactKey) return MASK;
    if (depth === 1 && NUMERIC_FIELDS.has(key)) return value;
    return isPhoneShapedNumber(value) ? MASK : value;
  }
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((v) => sanitizeRaw(v, depth + 1, key, contactKey));
  if (value !== null && typeof value === "object") {
    const out: Record<string, Prisma.InputJsonValue | null> = {};
    for (const [k, v] of Object.entries(value)) {
      if (depth === 0 && CONTACT_KEYS.has(k)) continue;
      out[k] = sanitizeRaw(v, depth + 1, k, contactKey);
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

/** Whether the item carries a key (a key whose value is `undefined` is not carried). */
function carries(raw: object, key: string): boolean {
  return (
    Object.prototype.hasOwnProperty.call(raw, key) &&
    (raw as Record<string, unknown>)[key] !== undefined
  );
}

/**
 * Value for an optional column under the re-ingest field rules (transitions.ts): `undefined`
 * (Prisma leaves the column as it is) when the item does not carry the key, the parsed value when
 * it carries one, null when it carries null or blank text (the schema turns those into undefined).
 */
function field<T>(raw: object, key: string, parsed: T | null | undefined): T | null | undefined {
  if (!carries(raw, key)) return undefined;
  return parsed ?? null;
}

/** Columns written from one item. Optional columns are `undefined` when they keep their value. */
type LeadFields = {
  /** undefined: not carried (kept on re-ingest; a new lead takes the schema default). */
  source?: string;
  sourceRef: string;
  companyName: string;
  title: string;
  rawJson: Prisma.InputJsonValue;
  bizRegNo?: string | null;
  industryCode?: string | null;
  /** undefined: the item carries no region key (the stored region is kept). */
  sido?: string;
  sigungu?: string | null;
  depopulationArea?: boolean;
  payMin?: number | null;
  payMax?: number | null;
  postedAt?: Date | null;
  closesAt?: Date | null;
  foreignIntent?: boolean | null;
  contactNameEnc?: string | null;
  contactPhoneEnc?: string | null;
  contactPhoneHash?: string | null;
  contactEmailEnc?: string | null;
};

type Prepared = { item: IngestJobLead; fields: LeadFields };

const REGION_KEYS = ["sido", "sigungu", "address"] as const;
const INDUSTRY_KEYS = ["industryCode", "industryName"] as const;

function prepare(
  raw: unknown,
  tables: TaggingTables,
  now: Date,
): Prepared | { reject: IngestRejectReason } {
  const parsed = ingestJobLeadSchema.safeParse(raw);
  if (!parsed.success || raw === null || typeof raw !== "object") return { reject: "INVALID" };
  const item = parsed.data;
  if (isReservedSourceRef(item.sourceRef)) return { reject: "RESERVED_SOURCE_REF" };
  if (item.payMin != null && item.payMax != null && item.payMin > item.payMax) {
    return { reject: "INVALID" };
  }
  if (item.closesAt && item.closesAt.getTime() < now.getTime()) return { reject: "CLOSED" };

  // Region: re-tagged as one unit when any region key is carried, kept when none is.
  const regionCarried = REGION_KEYS.some((k) => carries(raw, k));
  const region = regionCarried ? tagRegion(tables, item) : null;
  if (regionCarried && !region) return { reject: "UNKNOWN_REGION" };
  // Industry: re-tagged when either key is carried (both null → cleared, unknown text → null).
  const industryCarried = INDUSTRY_KEYS.some((k) => carries(raw, k));

  const phone = item.contactPhone ? normalizePhone(item.contactPhone) : null;
  const bizRegNo = item.bizRegNo?.replace(/\D/g, "") || null;
  return {
    item,
    fields: {
      source: carries(raw, "source") ? item.source : undefined,
      sourceRef: item.sourceRef,
      companyName: maskContacts(item.companyName),
      title: maskContacts(item.title),
      rawJson: sanitizeRaw(raw) ?? {},
      bizRegNo: field(raw, "bizRegNo", bizRegNo),
      industryCode: industryCarried ? tagIndustry(tables, item) : undefined,
      ...(region
        ? {
            sido: region.sido,
            sigungu: region.sigungu,
            depopulationArea: region.depopulationArea,
          }
        : {}),
      payMin: field(raw, "payMin", item.payMin),
      payMax: field(raw, "payMax", item.payMax),
      postedAt: field(raw, "postedAt", item.postedAt),
      closesAt: field(raw, "closesAt", item.closesAt),
      foreignIntent: field(raw, "foreignIntent", item.foreignIntent),
      contactNameEnc: field(raw, "contactName", item.contactName),
      contactPhoneEnc: field(raw, "contactPhone", phone),
      contactPhoneHash: field(raw, "contactPhone", phone ? phoneHashOf(phone) : null),
      contactEmailEnc: field(raw, "contactEmail", item.contactEmail),
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
    const { item, fields } = prepared;
    if (seen.has(item.sourceRef)) {
      result.rejected.push({ sourceRef: item.sourceRef, reason: "DUPLICATE_IN_BATCH" });
      continue;
    }
    seen.add(item.sourceRef);

    const outcome = await client.$transaction(async (tx) => {
      const existing = await tx.jobLead.findUnique({
        where: { sourceRef: item.sourceRef },
        select: { id: true, grade: true, archivedAt: true },
      });
      if (!existing) {
        // A new lead needs a 시·도 (JobLead.sido is required).
        const { sido, ...rest } = fields;
        if (!sido) return "UNKNOWN_REGION" as const;
        await tx.jobLead.create({ data: { ...rest, source: item.source, sido, grade: "C" } });
        return "created" as const;
      }
      // Fields left `undefined` keep the stored value (re-ingest field rules, transitions.ts).
      const { sourceRef: _ref, ...update } = fields;
      void _ref;
      const next = gradeOnReingest(existing, item);
      if (next !== existing.grade) {
        await transitionLead(tx, {
          leadId: existing.id,
          from: existing.grade,
          to: next,
          actorId: SYSTEM_ACTOR,
          reason: "INGEST_REPOSTED",
          now,
          data: update,
        });
      } else {
        // grade untouched (R-115: DO_NOT_CONTACT never returns to C)
        await tx.jobLead.update({ where: { id: existing.id }, data: update });
      }
      return "updated" as const;
    });
    if (outcome === "UNKNOWN_REGION") {
      result.rejected.push({ sourceRef: item.sourceRef, reason: outcome });
    } else if (outcome === "created") {
      result.created += 1;
    } else {
      result.updated += 1;
    }
  }
  return result;
}
