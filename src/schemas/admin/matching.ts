import { z } from "zod";

import {
  INTERVIEW_INTERPRETER_MAX,
  INTERVIEW_PLACE_MAX,
  RECOMMENDATION_NOTE_MAX,
} from "@/config/limits";

/**
 * 매칭·추천·면접 관리자 입력 (R-209, R-210). Dates are typed by staff in KST
 * (`<input type="datetime-local">` → "YYYY-MM-DDTHH:mm").
 */
const id = z.string().trim().min(1).max(64);
const note = z.string().trim().max(RECOMMENDATION_NOTE_MAX).optional().default("");

const kstDateTime = z
  .string()
  .trim()
  .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$/)
  .transform((v) => new Date(`${v}:00+09:00`))
  .refine((d) => !Number.isNaN(d.getTime()));

export const recommendForPostingSchema = z.object({ postingId: id, seekerId: id, note });

export const recommendForInterestSchema = z.object({ interestRequestId: id, note });

export const interviewScheduleSchema = z.object({
  scheduledAt: kstDateTime,
  place: z.string().trim().min(1).max(INTERVIEW_PLACE_MAX),
  interpreter: z
    .string()
    .trim()
    .max(INTERVIEW_INTERPRETER_MAX)
    .optional()
    .transform((v) => (v ? v : null)),
});

export const interviewCreateSchema = interviewScheduleSchema.extend({ recommendationId: id });
export const interviewRescheduleSchema = interviewScheduleSchema.extend({ interviewId: id });

export const interviewIdSchema = z.object({ interviewId: id });

export const interviewResultSchema = z.object({
  interviewId: id,
  attended: z.enum(["", "YES", "NO"]).transform((v) => (v === "" ? null : v === "YES")),
  result: z
    .enum(["", "PENDING", "HIRED", "REJECTED", "NO_SHOW"])
    .transform((v) => (v === "" ? null : v)),
});
