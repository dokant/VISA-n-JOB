import { z } from "zod";

/** CallLog.outcome values (WO §5 CallLog, R-121). Grade effects: src/lib/admin/leadDesk.ts. */
export const CALL_OUTCOMES = [
  "NO_ANSWER",
  "NO_INTENT",
  "INTERESTED",
  "REQUEST_RECEIVED",
  "DNC",
] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];

/**
 * Outcomes that move the lead to DO_NOT_CONTACT (final, R-115; DECISIONS Q-14). The form asks for a
 * confirmation first and sends `confirmFinal=yes`; the server refuses them without it.
 */
export const FINAL_CALL_OUTCOMES = ["NO_INTENT", "DNC"] as const satisfies readonly CallOutcome[];

export function isFinalCallOutcome(o: CallOutcome): boolean {
  return (FINAL_CALL_OUTCOMES as readonly CallOutcome[]).includes(o);
}

/** Staff note length is a storage bound (S-53), not a business value. */
export const CALL_NOTE_MAX = 500;

const id = z.string().trim().min(1).max(64);

/** 통화 기록 (R-121). nextActionAt: optional YYYY-MM-DD (KST day start). */
export const leadCallSchema = z.object({
  leadId: id,
  outcome: z.enum(CALL_OUTCOMES),
  note: z.string().trim().max(CALL_NOTE_MAX),
  nextActionAt: z
    .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
    .transform((v) => (v === "" ? null : new Date(`${v}T00:00:00+09:00`))),
  confirmFinal: z.enum(["", "yes"]).default(""),
});

export const leadIdSchema = z.object({ leadId: id });

export function isCallOutcome(v: unknown): v is CallOutcome {
  return typeof v === "string" && (CALL_OUTCOMES as readonly string[]).includes(v);
}
