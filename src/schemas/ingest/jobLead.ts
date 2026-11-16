import { z } from "zod";

import { INGEST_MAX_BATCH } from "@/config/limits";

/**
 * POST /api/ingest/job-leads body (R-114, WO §8.1, STANDARD 5).
 *
 * The body is a JSON array of 1 ~ INGEST_MAX_BATCH items. The array is checked first (400 for the
 * whole request when it is not an array, empty or too long); each item is then checked on its own
 * so one bad item is reported in `rejected` without failing the batch.
 *
 * Region and industry may come as reference codes (`SEOUL`, `C`) or as Korean text as published by
 * the source (`충남`, `천안시 서북구`, `제조업`); src/lib/leads/tagging.ts maps them with the seed
 * tables. Unknown extra keys are allowed: the whole original item is kept in `rawJson`.
 */
export const INGEST_SOURCES = ["WORK24_API", "AGENT", "MANUAL"] as const;
export type IngestSource = (typeof INGEST_SOURCES)[number];

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : undefined));
const pay = z.number().int().min(0).max(1_000_000_000).optional().nullable();
const dateTime = z
  .string()
  .datetime({ offset: true })
  .or(z.string().date())
  .optional()
  .nullable()
  .transform((v) => (v ? new Date(v) : undefined));

export const ingestJobLeadSchema = z
  .object({
    source: z.enum(INGEST_SOURCES).default("AGENT"),
    sourceRef: text(200),
    companyName: text(200),
    bizRegNo: optionalText(20),
    /** KSIC code: section letter ("C") or a letter-prefixed code ("C25", "C2511"). */
    industryCode: optionalText(10),
    /** Industry text as published ("제조업"). Used when the code is missing or unknown. */
    industryName: optionalText(100),
    /** 시·도 code or name ("SEOUL", "서울특별시", "서울", "충남"). Falls back to `address`. */
    sido: optionalText(40),
    /** 시·군·구 code or name ("천안시", "천안시 서북구"). */
    sigungu: optionalText(60),
    /** Work place address; its first words are used when sido / sigungu are missing. */
    address: optionalText(300),
    title: text(300),
    payMin: pay,
    payMax: pay,
    postedAt: dateTime,
    closesAt: dateTime,
    foreignIntent: z.boolean().optional().nullable(),
    /** Company contact for staff calls. Stored encrypted only; masked inside rawJson. */
    contactName: optionalText(60),
    contactPhone: optionalText(32),
    contactEmail: optionalText(254),
  })
  .passthrough();

export type IngestJobLeadInput = z.input<typeof ingestJobLeadSchema>;
export type IngestJobLead = z.output<typeof ingestJobLeadSchema>;

/** The body must be an array of 1 ~ INGEST_MAX_BATCH items (items are validated one by one). */
export const ingestBatchSchema = z.array(z.unknown()).min(1).max(INGEST_MAX_BATCH);
