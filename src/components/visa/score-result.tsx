import { useFormatter, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { REFERENCE_DISCLAIMER_KEY } from "@/lib/visa-engine/constants";

/** Score result with labels already localized on the server. */
export type ScoreView = {
  total: number;
  maxTotal: number;
  passScore: number | null;
  items: Array<{ key: string; label: string; points: number; maxPoints: number }>;
  shortfalls: Array<{ key: string; label: string; gap: number }>;
};

type Props = { result: ScoreView; className?: string };

function ratio(points: number, max: number): number {
  return max > 0 ? Math.max(0, Math.min(1, points / max)) : 0;
}

/**
 * STANDARD v2 3.2 ScoreResult (R-127): total (text-metric navy, tabular), per-item bars (progress
 * look: 5px n200 track, --grad fill; label n700, value 600 navy), shortfall items as orange badges,
 * and the reference disclaimer (always, BR-11).
 */
export function ScoreResult({ result, className }: Props) {
  const t = useTranslations();
  const format = useFormatter();
  return (
    <article
      data-testid="score-result"
      className={cn(
        "vj-panel-in grid gap-6 rounded-md border border-border bg-white p-6 shadow-1",
        className,
      )}
    >
      <div className="grid gap-1">
        <h3 className="text-h3 text-navy">{t("visa.score.result.title")}</h3>
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="sr-only">{t("visa.score.result.total")}</span>
          <span className="text-metric text-navy tabular-nums">{format.number(result.total)}</span>
          <span className="text-dense text-n500">
            {t("visa.score.result.outOf", { max: result.maxTotal })}
          </span>
          {result.passScore !== null ? (
            <span className="text-dense text-n700">
              {t("visa.score.result.passScore", { score: result.passScore })}
            </span>
          ) : null}
        </p>
      </div>

      <div className="grid gap-3">
        <h4 className="text-label text-n700">{t("visa.score.result.items")}</h4>
        <ul className="grid gap-3">
          {result.items.map((item) => (
            <li key={item.key} className="grid gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-dense">
                <span className="text-n700">{item.label}</span>
                <span className="font-semibold text-navy tabular-nums">
                  {t("visa.score.result.pointsOf", { points: item.points, max: item.maxPoints })}
                </span>
              </div>
              <span
                aria-hidden="true"
                className="block h-1.25 overflow-hidden rounded-full bg-n200"
              >
                <span
                  className="block h-full origin-left rounded-full bg-(image:--grad) transition-transform duration-600 ease-out"
                  style={{ transform: `scaleX(${ratio(item.points, item.maxPoints)})` }}
                />
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-2">
        <h4 className="text-label text-n700">{t("visa.score.result.shortfalls")}</h4>
        {result.shortfalls.length === 0 ? (
          <p className="text-dense text-n500">{t("visa.score.result.noShortfalls")}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {result.shortfalls.map((s) => (
              <li key={s.key}>
                <Badge variant="orange" className="text-caption tracking-normal">
                  {s.label}
                  <span aria-hidden="true">·</span>
                  {t("visa.score.result.shortfallGap", { gap: s.gap })}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-caption font-semibold text-n700" data-testid="reference-disclaimer">
        {t(REFERENCE_DISCLAIMER_KEY)}
      </p>
    </article>
  );
}
