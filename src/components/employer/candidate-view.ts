import { getFormatter, getLocale, getTranslations } from "next-intl/server";

import { STAY_REMAINING_BANDS } from "@/config/limits";
import { formatDate, formatMonth } from "@/i18n/dateTime";
import type { StayRemainingBand } from "@/lib/candidates/stayBand";
import { getIndustries, getSidoRegions, getVisaTypes } from "@/lib/referenceData";
import type { BlindSeeker } from "@/lib/serializers/blindSeeker";
import { ANY_REGION } from "@/lib/seeker/options";

export type CandidateFact = { key: string; label: string; value: string };
export type CandidateVisa = { code: string; nameKey: string; isStatusCode: boolean };

/** Localized display values of one blind candidate (server only; input is a BlindSeeker). */
export type CandidateView = {
  publicId: string;
  /** Short, readable form of the blind id for the card title. */
  label: string;
  grade: "S" | "A";
  verifiedVisa: boolean;
  verifiedKorean: boolean;
  visa: CandidateVisa | null;
  visaSubType: string | null;
  /** Only a visa in the reference table (VisaLabel, S-16); an unknown code is never shown raw. */
  convertible: { visa: CandidateVisa; at: string | null } | null;
  facts: CandidateFact[];
  experience: string[];
};

export type Option = { value: string; label: string };

export type CandidateReference = {
  visas: CandidateVisa[];
  visaOptions: Option[];
  stayOptions: Option[];
  industryOptions: Option[];
  stayLabel: (band: StayRemainingBand) => string;
};

/** Filter options and label helpers from the reference tables (no visa list in code, BR-12). */
export async function loadCandidateReference(): Promise<CandidateReference> {
  const t = await getTranslations();
  const [visas, industries] = await Promise.all([getVisaTypes(), getIndustries()]);
  const stayLabel = (band: StayRemainingBand): string => {
    const b = STAY_REMAINING_BANDS.find((x) => x.code === band);
    if (!b) return t("employer.candidates.stayBand.unknown");
    if (b.maxMonths === null) return t("employer.candidates.stayBand.over", { min: b.minMonths });
    if (b.minMonths === 0) return t("employer.candidates.stayBand.under", { max: b.maxMonths });
    return t("employer.candidates.stayBand.range", { min: b.minMonths, max: b.maxMonths });
  };
  const statusVisas = visas.filter((v) => v.isStatusCode);
  return {
    visas: visas.map((v) => ({ code: v.code, nameKey: v.nameKey, isStatusCode: v.isStatusCode })),
    visaOptions: statusVisas.map((v) => ({ value: v.code, label: `${v.code} ${t(v.nameKey)}` })),
    stayOptions: STAY_REMAINING_BANDS.map((b) => ({ value: b.code, label: stayLabel(b.code) })),
    industryOptions: industries.map((i) => ({ value: i.code, label: t(i.nameKey) })),
    stayLabel,
  };
}

/**
 * Turns serialized candidates into display rows: region / industry names from the reference
 * tables, country and language names from `Intl.DisplayNames` in the viewer's locale, money and
 * dates with next-intl's formatter, coded answers through the wizard's option messages.
 */
export async function loadCandidateViews(
  candidates: readonly BlindSeeker[],
  ref: CandidateReference,
): Promise<CandidateView[]> {
  if (candidates.length === 0) return [];
  const t = await getTranslations();
  const format = await getFormatter();
  const locale = await getLocale();
  const sidos = await getSidoRegions();
  const industries = await getIndustries();
  const sidoName = new Map(sidos.map((s) => [s.code, t(s.nameKey)]));
  const industryName = new Map(industries.map((i) => [i.code, t(i.nameKey)]));
  const visaOf = new Map(ref.visas.map((v) => [v.code, v]));
  const countries = new Intl.DisplayNames([locale], { type: "region" });
  const languages = new Intl.DisplayNames([locale], { type: "language" });

  const c = (key: string, values?: Record<string, string | number>) =>
    t(`employer.candidates.card.${key}`, values);
  const opt = (path: string, value: string) => t(`seeker.register.${path}.option.${value}`);
  const none = c("none");
  const unanswered = c("notAnswered");
  const list = (items: readonly string[]) => (items.length > 0 ? items.join(", ") : none);
  const country = (code: string | null) => {
    if (!code) return unanswered;
    if (code === "OTHER") return t("seeker.register.common.otherCountry");
    try {
      return countries.of(code) ?? code;
    } catch {
      return code;
    }
  };
  const language = (code: string) => {
    if (code === "OTHER") return t("seeker.register.common.otherLanguage");
    try {
      return languages.of(code) ?? code;
    } catch {
      return code;
    }
  };
  const monthText = (ym: string | null) =>
    ym ? formatMonth(locale, new Date(`${ym}-01T00:00:00Z`)) : unanswered;
  const money = (n: number) =>
    format.number(n, { style: "currency", currency: "KRW", maximumFractionDigits: 0 });

  const convertibleOf = (s: BlindSeeker): CandidateView["convertible"] => {
    const visa = s.convertibleVisa ? visaOf.get(s.convertibleVisa) : undefined;
    if (!visa) return null;
    return {
      visa,
      at: s.convertibleAt ? c("convertibleAt", { date: monthText(s.convertibleAt) }) : null,
    };
  };

  return candidates
    .filter((s): s is BlindSeeker & { grade: "S" | "A" } => s.grade === "S" || s.grade === "A")
    .map((s) => {
      const facts: CandidateFact[] = [
        { key: "nationality", label: c("nationality"), value: country(s.nationality) },
        {
          key: "sido",
          label: c("sido"),
          value: s.sido ? (sidoName.get(s.sido) ?? s.sido) : unanswered,
        },
        { key: "stay", label: c("stay"), value: ref.stayLabel(s.stayRemainingBand) },
        {
          key: "yearsInKorea",
          label: c("yearsInKorea"),
          value: s.yearsInKorea === null ? unanswered : c("years", { count: s.yearsInKorea }),
        },
        {
          key: "education",
          label: c("education"),
          value: s.educationLevel ? opt("step3.educationLevel", s.educationLevel) : unanswered,
        },
        {
          key: "majorField",
          label: c("majorField"),
          value: s.majorField ? opt("step3.majorField", s.majorField) : unanswered,
        },
        ...(s.graduationDate
          ? [{ key: "graduation", label: c("graduation"), value: monthText(s.graduationDate) }]
          : []),
        {
          key: "topik",
          label: c("topik"),
          value: s.topikLevel === null ? unanswered : opt("step3.topikLevel", String(s.topikLevel)),
        },
        {
          key: "kiip",
          label: c("kiip"),
          value: s.kiipStage === null ? unanswered : opt("step3.kiipStage", String(s.kiipStage)),
        },
        {
          key: "speaking",
          label: c("speaking"),
          value:
            s.koreanSpeaking === null
              ? unanswered
              : opt("step3.koreanSpeaking", String(s.koreanSpeaking)),
        },
        { key: "languages", label: c("languages"), value: list(s.otherLanguages.map(language)) },
        {
          key: "skills",
          label: c("skills"),
          value: list(s.skills.map((v) => opt("step4.skills", v))),
        },
        {
          key: "licenses",
          label: c("licenses"),
          value: list(s.licenses.map((v) => opt("step4.licenses", v))),
        },
        {
          key: "jobSearch",
          label: c("jobSearch"),
          value: s.jobSearchStatus ? opt("step5.jobSearchStatus", s.jobSearchStatus) : unanswered,
        },
        ...(s.availableFrom
          ? [
              {
                key: "availableFrom",
                label: c("availableFrom"),
                value: formatDate(locale, new Date(`${s.availableFrom}T00:00:00Z`), {
                  timeZone: "UTC",
                }),
              },
            ]
          : []),
        {
          key: "desiredIndustries",
          label: c("desiredIndustries"),
          value: list(s.desiredIndustries.map((v) => industryName.get(v) ?? v)),
        },
        {
          key: "desiredRegions",
          label: c("desiredRegions"),
          value: list(
            s.desiredRegions.map((v) =>
              v === ANY_REGION ? c("anyRegion") : (sidoName.get(v) ?? v),
            ),
          ),
        },
        {
          key: "dormitory",
          label: c("dormitory"),
          value: s.needDormitory === null ? unanswered : s.needDormitory ? c("yes") : c("no"),
        },
        {
          key: "shift",
          label: c("shift"),
          value: s.shiftOk ? opt("step5.shiftOk", s.shiftOk) : unanswered,
        },
        {
          key: "desiredPay",
          label: c("desiredPay"),
          value:
            s.desiredPayMin === null
              ? unanswered
              : c("payFrom", { amount: money(s.desiredPayMin) }),
        },
        ...(s.groupApplySize !== null
          ? [
              {
                key: "group",
                label: c("group"),
                value: c("groupSize", { count: s.groupApplySize }),
              },
            ]
          : []),
      ];
      const experience = s.experienceSummary.map((e) =>
        c("experienceItem", {
          industry: industryName.get(e.industry) ?? t("common.industryUnknown"),
          role: opt("step4.role", e.role),
          months: e.months,
        }),
      );
      return {
        publicId: s.publicId,
        label: s.publicId.slice(0, 6).toUpperCase(),
        grade: s.grade,
        verifiedVisa: s.verifiedVisa,
        verifiedKorean: s.verifiedKorean,
        visa: s.visaCode ? (visaOf.get(s.visaCode) ?? null) : null,
        visaSubType: s.visaSubType,
        convertible: convertibleOf(s),
        facts,
        experience,
      };
    });
}
