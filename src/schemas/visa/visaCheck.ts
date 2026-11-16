import { z } from "zod";

/**
 * Visa check form (R-126) — shared by the home widget, /visa-check and the server action.
 * Values are reference-data codes (VisaType.code, Region SIDO code, Industry.code); the server
 * re-checks them against the database.
 */
const code = z.string().trim().min(1).max(40);

export const visaCheckSchema = z.object({
  visaCode: code,
  sido: code.optional().or(z.literal("").transform(() => undefined)),
  industryCode: code.optional().or(z.literal("").transform(() => undefined)),
});

export type VisaCheckInput = z.infer<typeof visaCheckSchema>;
