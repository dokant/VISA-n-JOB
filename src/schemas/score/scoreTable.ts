import { z } from "zod";

/**
 * ScoreTable.items JSON — structure only (R-127, WO §10). Items → bands → points.
 * Point values are entered and PUBLISHED by the 행정사 (R-215); none are defined in code (BR-12).
 * Labels are either one string (operator language) or a per-locale map `{ ko, en, … }`.
 */
export const localizedTextSchema = z.union([
  z.string().min(1),
  z.record(z.string(), z.string().min(1)),
]);

export const scoreBandSchema = z.object({
  key: z.string().min(1),
  label: localizedTextSchema,
  points: z.number().finite(),
});

export const scoreItemSchema = z.object({
  key: z.string().min(1),
  label: localizedTextSchema,
  bands: z.array(scoreBandSchema).min(1),
});

export const scoreTableItemsSchema = z
  .object({
    items: z.array(scoreItemSchema).min(1),
  })
  .passthrough();

export type LocalizedText = z.infer<typeof localizedTextSchema>;
export type ScoreBand = z.infer<typeof scoreBandSchema>;
export type ScoreItem = z.infer<typeof scoreItemSchema>;

/** Calculator answers: item key → chosen band key. */
export const scoreAnswersSchema = z.record(z.string().min(1), z.string().min(1));
export type ScoreAnswers = z.infer<typeof scoreAnswersSchema>;
