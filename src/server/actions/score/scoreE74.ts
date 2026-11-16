"use server";

import { getLocale } from "next-intl/server";

import type { ScoreView } from "@/components/visa/score-result";
import { localize, scoreE74 } from "@/lib/score/e74";
import { scoreAnswersSchema } from "@/schemas/score/scoreTable";

export type ScoreState =
  | { status: "idle" }
  | { status: "notReady" }
  | { status: "error" }
  | { status: "ok"; result: ScoreView };

/** Server action for /score/e74. Answers are `item.<key>` form fields holding the band key. */
export async function scoreE74Action(_prev: ScoreState, formData: FormData): Promise<ScoreState> {
  // rbac: public — 점수 계산은 비로그인 공개 기능 (STANDARD 4.5 공개 예외, R-127)
  try {
    const answers: Record<string, string> = {};
    for (const [name, value] of formData.entries()) {
      if (name.startsWith("item.") && typeof value === "string" && value) {
        answers[name.slice("item.".length)] = value;
      }
    }
    const parsed = scoreAnswersSchema.safeParse(answers);
    if (!parsed.success) return { status: "error" };

    const result = await scoreE74(parsed.data);
    if (result.status === "NOT_READY") return { status: "notReady" };

    const locale = await getLocale();
    return {
      status: "ok",
      result: {
        total: result.total,
        maxTotal: result.maxTotal,
        passScore: result.passScore,
        items: result.items.map((i) => ({
          key: i.key,
          label: localize(i.label, locale),
          points: i.points,
          maxPoints: i.maxPoints,
        })),
        shortfalls: result.shortfalls.map((s) => ({
          key: s.key,
          label: localize(s.label, locale),
          gap: s.gap,
        })),
      },
    };
  } catch {
    return { status: "error" };
  }
}
