import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { VisaLabel } from "@/components/visa/visa-label";
import { Link } from "@/i18n/navigation";

import type { PostingView } from "./posting-view";
import { VerifiedBadge } from "./verified-badge";

/**
 * One blind posting in the /jobs list (STANDARD 3.1 card: white, border, rounded-md, shadow-1).
 * Only WO §8.5 values from PostingView; no company name, address or contact (BR-03).
 */
export function PostingCard({ posting }: { posting: PostingView }) {
  const t = useTranslations("public.jobs");
  const titleId = `posting-${posting.id}-title`;
  return (
    <article
      aria-labelledby={titleId}
      data-testid="posting-card"
      data-posting-id={posting.id}
      className="grid content-start gap-4 rounded-md border border-border bg-white p-6 shadow-1"
    >
      <div className="flex flex-wrap items-center gap-2">
        <VerifiedBadge />
      </div>
      <div className="grid gap-1.5">
        <h2 id={titleId} className="text-h3 break-words text-navy">
          {posting.title}
        </h2>
        <p className="text-dense text-n700">
          {posting.region} · {posting.industry}
        </p>
      </div>
      <dl className="grid gap-2 text-dense">
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-n500">{t("facts.role")}</dt>
          <dd className="text-navy">{posting.role}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-n500">{t("facts.pay")}</dt>
          <dd className="font-semibold text-navy tabular-nums">{posting.payText}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-n500">{t("facts.headcount")}</dt>
          <dd className="text-navy tabular-nums">{posting.headcountText}</dd>
        </div>
      </dl>
      {posting.visas.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-caption text-n500">{t("facts.visas")}</p>
          <ul className="flex flex-wrap gap-2" data-testid="posting-visas">
            {posting.visas.map((v) => (
              <li key={v.code} className="text-dense text-navy">
                <VisaLabel code={v.code} nameKey={v.nameKey} showCode={v.isStatusCode} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/jobs/${posting.id}`} data-testid="posting-detail-link">
            {t("viewDetail")}
            <ArrowRight aria-hidden="true" strokeWidth={1.5} data-icon="trailing" />
          </Link>
        </Button>
      </div>
    </article>
  );
}
