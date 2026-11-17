import { ArrowRight, BadgeCheck, CircleDashed, FileCheck, FileX } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { GradeBadge } from "@/components/seeker/grade-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { CandidateAccess } from "@/lib/candidates/access";
import type { CandidateStats } from "@/lib/candidates/stats";
import { getSidoRegions } from "@/lib/referenceData";

/**
 * 요약 통계 (WO §9.3 "아니면 요약 통계만", R-205, R-218, PC-11): counts per 시·도 × 등급, cells under
 * the minimum sample masked, and the total hidden while any cell is masked (no subtraction gives a
 * masked value back — `maskCandidateStats`). Shown to signed-in companies that are not verified or have no contract,
 * with what is still missing. No candidate row or field is shown here.
 */
export async function CandidateStatsView({
  stats,
  access,
}: {
  stats: CandidateStats;
  access: CandidateAccess;
}) {
  const t = await getTranslations("employer.candidates.stats");
  const tr = await getTranslations();
  const format = await getFormatter();
  const sidos = await getSidoRegions();
  const sidoName = new Map(sidos.map((s) => [s.code, tr(s.nameKey)]));
  const count = (n: number | null) =>
    n === null ? t("masked", { min: stats.minSample }) : t("people", { count: format.number(n) });

  return (
    <div className="grid gap-8" data-testid="candidate-stats">
      <section className="grid gap-4 rounded-md border border-border bg-white p-6 shadow-1">
        <h2 className="text-h3 text-navy">{t("title")}</h2>
        <p className="text-dense text-n700">{t("lead")}</p>
        <div className="flex flex-wrap gap-2" data-testid="company-access">
          {access.verified ? (
            <Badge variant="cyan">
              <BadgeCheck aria-hidden="true" strokeWidth={1.5} />
              {t("verified")}
            </Badge>
          ) : (
            <Badge variant="orange" data-testid="access-unverified">
              <CircleDashed aria-hidden="true" strokeWidth={1.5} />
              {t("unverified")}
            </Badge>
          )}
          {access.contracted ? (
            <Badge variant="blue">
              <FileCheck aria-hidden="true" strokeWidth={1.5} />
              {t("contracted")}
            </Badge>
          ) : (
            <Badge variant="outline" data-testid="access-not-contracted">
              <FileX aria-hidden="true" strokeWidth={1.5} />
              {t("notContracted")}
            </Badge>
          )}
        </div>
        {!access.verified ? <p className="text-caption text-n700">{t("verifyNote")}</p> : null}
        {!access.contracted ? (
          <div>
            <Button asChild>
              <Link href="/employer/contract" data-testid="contract-link">
                {t("contractCta")}
                <ArrowRight aria-hidden="true" strokeWidth={1.5} data-icon="trailing" />
              </Link>
            </Button>
          </div>
        ) : null}
      </section>

      <section className="grid gap-4" aria-labelledby="stats-total">
        <div className="grid gap-1">
          <h2 id="stats-total" className="text-dense font-semibold text-n700">
            {t("total")}
          </h2>
          <p
            className="text-metric text-navy tabular-nums"
            data-testid="stats-total"
            data-total-mask={stats.totalMask ?? "none"}
          >
            {stats.totalMask === "HAS_MASKED_CELL" ? t("withheld") : count(stats.total)}
          </p>
          {stats.totalMask === "HAS_MASKED_CELL" ? (
            <p className="text-caption text-n700">{t("withheldNote")}</p>
          ) : null}
        </div>
        {stats.cells.length === 0 ? (
          <p className="text-dense text-n700">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border bg-white shadow-1">
            <table className="w-full border-collapse text-dense" data-testid="stats-table">
              <caption className="sr-only">{t("caption")}</caption>
              <thead className="bg-n50 text-label text-n700">
                <tr>
                  <th scope="col" className="px-4 py-3 text-start">
                    {t("region")}
                  </th>
                  <th scope="col" className="px-4 py-3 text-start">
                    {t("grade")}
                  </th>
                  <th scope="col" className="px-4 py-3 text-end">
                    {t("count")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.cells.map((c) => (
                  <tr
                    key={`${c.sido ?? "-"}-${c.grade}`}
                    className="border-t border-n100"
                    data-masked={c.count === null ? "true" : "false"}
                  >
                    <td className="px-4 py-3 text-navy">
                      {c.sido ? (sidoName.get(c.sido) ?? c.sido) : t("noRegion")}
                    </td>
                    <td className="px-4 py-3">
                      <GradeBadge grade={c.grade} />
                    </td>
                    <td className="px-4 py-3 text-end text-navy tabular-nums">{count(c.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-caption text-n500">{t("maskNote", { min: stats.minSample })}</p>
      </section>
    </div>
  );
}
