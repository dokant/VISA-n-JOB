import { z } from "zod";

/** 면접 신청 (R-203): the posting the signed-in seeker asks an interview for. */
export const interestRequestSchema = z.object({ postingId: z.string().trim().min(1).max(64) });

export type InterestRequestInput = z.infer<typeof interestRequestSchema>;
