import { BadgeCheck, Languages } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { GradeBadge } from "@/components/seeker/grade-badge";
import { Badge } from "@/components/ui/badge";
import { VisaLabel } from "@/components/visa/visa-label";

import type { CandidateView } from "./candidate-view";

/**
 * One blind candidate (R-205, STANDARD 3.1 card). Only WO §7.5 values from CandidateView — no name,
 * photo, initials, birth year, gender, school, free text or contact (BR-02). The only action is
 * "면접 요청" (`action`).
 */
export function CandidateCard({
  candidate,
  action,
}: {
  candidate: CandidateView;
  action: ReactNode;
}) {
  const t = useTranslations("employer.candidates.card");
  const titleId = `candidate-${candidate.publicId}-title`;
  return (
    <article
      aria-labelledby={titleId}
      data-testid="candidate-card"
      data-public-id={candidate.publicId}
      className="grid content-start gap-5 rounded-md border border-border bg-white p-6 shadow-1"
    >
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <GradeBadge grade={candidate.grade} />
          {candidate.verifiedVisa ? (
            <Badge variant="cyan" data-testid="badge-verified-visa">
              <BadgeCheck aria-hidden="true" strokeWidth={1.5} />
              {t("verifiedVisa")}
            </Badge>
          ) : null}
          {candidate.verifiedKorean ? (
            <Badge variant="cyan" data-testid="badge-verified-korean">
              <Languages aria-hidden="true" strokeWidth={1.5} />
              {t("verifiedKorean")}
            </Badge>
          ) : null}
        </div>
        <h2 id={titleId} className="text-h3 text-navy">
          {t("id", { id: candidate.label })}
        </h2>
        {candidate.visa ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-dense text-navy">
            <span className="sr-only">{t("visa")}</span>
            <VisaLabel
              code={candidate.visa.code}
              nameKey={candidate.visa.nameKey}
              showCode={candidate.visa.isStatusCode}
            />
            {candidate.visaSubType ? (
              <span className="text-caption text-n700">{candidate.visaSubType}</span>
            ) : null}
          </p>
        ) : null}
      </div>

      <dl className="grid gap-x-6 gap-y-2.5 text-dense sm:grid-cols-2">
        {candidate.facts.map((f) => (
          <div key={f.key} className="grid gap-0.5" data-fact={f.key}>
            <dt className="text-caption text-n500">{f.label}</dt>
            <dd className="text-navy">{f.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-1.5">
        <h3 className="text-caption font-semibold text-n700">{t("experience")}</h3>
        {candidate.experience.length > 0 ? (
          <ul className="grid gap-1 text-dense text-navy" data-testid="candidate-experience">
            {candidate.experience.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        ) : (
          <p className="text-dense text-n700">{t("none")}</p>
        )}
      </div>

      {candidate.convertible ? (
        <div className="grid gap-1 rounded-sm border border-n200 bg-n50 px-3.5 py-3">
          <p className="text-caption text-n500">
            {t("convertible")} · {t("convertibleNote")}
          </p>
          <p className="flex flex-wrap items-center gap-2 text-dense text-navy">
            <VisaLabel
              code={candidate.convertible.visa.code}
              nameKey={candidate.convertible.visa.nameKey}
              showCode={candidate.convertible.visa.isStatusCode}
            />
            {candidate.convertible.at ? (
              <span className="text-caption text-n700">{candidate.convertible.at}</span>
            ) : null}
          </p>
        </div>
      ) : null}

      <div>{action}</div>
    </article>
  );
}
