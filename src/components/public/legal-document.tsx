import { getLocale, getTranslations } from "next-intl/server";

import { ExpertReviewMark } from "@/components/legal/expert-review-mark";
import { PageShell } from "@/components/public/page-shell";
import { formatDate } from "@/i18n/dateTime";

const SECTION_KEYS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7"] as const;
/** Date the drafts were written (shown as "초안 작성일"). */
const DRAFT_DATE = new Date("2026-11-16T00:00:00+09:00");

type Props = { doc: "privacy" | "terms" };

/**
 * Legal draft page (R-102, N-03). [전문가 검토 필요] right under the title (ExpertReviewMark).
 * SC-08: on non-Korean pages every section shows the translation together with the Korean original.
 */
export async function LegalDocument({ doc }: Props) {
  const locale = await getLocale();
  const t = await getTranslations(`legal.${doc}`);
  const tKo = await getTranslations({ locale: "ko", namespace: `legal.${doc}` });
  const tl = await getTranslations("legal");
  const bilingual = locale !== "ko";

  return (
    <PageShell
      title={t("title")}
      lead={tl("draftDate", { date: formatDate(locale, DRAFT_DATE, { dateStyle: "long" }) })}
      afterHeader={<ExpertReviewMark />}
      narrow={!bilingual}
    >
      <div className="grid gap-10" data-testid="legal-document">
        {bilingual ? (
          <div className="hidden gap-8 text-label text-n500 md:grid md:grid-cols-2">
            <span>{tl("translation")}</span>
            <span lang="ko">{tl("koreanOriginal")}</span>
          </div>
        ) : null}
        {SECTION_KEYS.map((key) => (
          <section
            key={key}
            className={bilingual ? "grid gap-6 md:grid-cols-2 md:gap-8" : "grid gap-3"}
          >
            <div className="grid content-start gap-3">
              <h2 className="text-h3 text-navy">{t(`sections.${key}.title`)}</h2>
              <p className="text-body text-n700">{t(`sections.${key}.body`)}</p>
            </div>
            {bilingual ? (
              <div
                lang="ko"
                className="grid content-start gap-3 rounded-sm border border-n200 bg-n50 p-4"
              >
                <span className="text-label text-n500 md:hidden">{tl("koreanOriginal")}</span>
                <h3 className="text-body font-semibold text-navy">
                  {tKo(`sections.${key}.title`)}
                </h3>
                <p className="text-dense text-n700">{tKo(`sections.${key}.body`)}</p>
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </PageShell>
  );
}
