/**
 * 무료 채용 진단 (R-124, WO §9.1, WO §10, BR-11, BR-12).
 *
 * - Which visas are listed comes from VisaType data: active rows that are a 체류자격 code
 *   (`isStatusCode`) and allow job registration (`registrable`, BR-08). No visa list in code.
 * - Each visa is judged only by `evaluateRules` over the PUBLISHED VisaRule rows. With no matching
 *   published rule the result is YELLOW + "행정사 확인 필요" (WO §15-9). Seeded SAMPLE rules are
 *   DRAFT and never used.
 * - Rule conditions may refer to these facts (written by the 행정사 in the rules screen, R-215):
 *     context = "EMPLOYER_DIAGNOSIS" (to tell employer rules from the seeker visa check),
 *     industryCode, sido, sigungu, depopulationArea, regularEmployees, insuredDomestic,
 *     foreignWorkersTotal, foreignWorkersOfVisa (current workers holding the visa being judged).
 * - Every submission is saved as a lead (source DIAGNOSIS, grade C). A signed-in company keeps one
 *   diagnosis lead (`DIAGNOSIS:COMPANY:<id>`) that is updated on each run; an anonymous visitor's
 *   run creates a new lead without company name or contact (PLAN P1d 위험: JobLead.companyName and
 *   title are nullable for this reason).
 */
import { randomUUID } from "node:crypto";

import type { Outcome, Prisma } from "@prisma/client";

import { SYSTEM_ACTOR } from "@/lib/audit";
import { db } from "@/lib/db";
import { transitionLead } from "@/lib/leads/transitions";
import { NEEDS_REVIEW_MESSAGE_KEY, evaluateRules } from "@/lib/visa-engine/evaluate";
import type { DiagnosisValues } from "@/schemas/employer/diagnosis";

export const DIAGNOSIS_SOURCE = "DIAGNOSIS";
export const DIAGNOSIS_CONTEXT = "EMPLOYER_DIAGNOSIS";

export type DiagnosisVisa = { code: string; nameKey: string; isStatusCode: boolean };

export type DiagnosisVisaResult = DiagnosisVisa & {
  outcome: Outcome;
  messageKey: string;
  ruleId: string | null;
};

/** Visas with the same outcome and message are shown on one OutcomeCard. */
export type DiagnosisGroup = { outcome: Outcome; messageKey: string; visas: DiagnosisVisa[] };

export type DiagnosisResult = {
  groups: DiagnosisGroup[];
  /** true when at least one visa had no matching PUBLISHED rule ("행정사 확인 필요"). */
  needsReview: boolean;
};

export type DiagnosisOutcome =
  { ok: true; result: DiagnosisResult; leadId: string } | { ok: false; code: "INVALID_REFERENCE" };

const OUTCOME_ORDER: Readonly<Record<Outcome, number>> = { GREEN: 0, YELLOW: 1, RED: 2 };

export function groupResults(results: readonly DiagnosisVisaResult[]): DiagnosisGroup[] {
  const groups = new Map<string, DiagnosisGroup>();
  for (const r of results) {
    const key = `${r.outcome}|${r.messageKey}`;
    const group = groups.get(key) ?? { outcome: r.outcome, messageKey: r.messageKey, visas: [] };
    group.visas.push({ code: r.code, nameKey: r.nameKey, isStatusCode: r.isStatusCode });
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => OUTCOME_ORDER[a.outcome] - OUTCOME_ORDER[b.outcome]);
}

type Client = typeof db;

export async function runDiagnosis(
  values: DiagnosisValues,
  options: { companyId?: string | null; actorId?: string | null; now?: Date } = {},
  client: Client = db,
): Promise<DiagnosisOutcome> {
  const now = options.now ?? new Date();
  const [industry, sigungu, visaTypes] = await Promise.all([
    client.industry.findUnique({ where: { code: values.industryCode }, select: { code: true } }),
    client.region.findUnique({
      where: { code: values.sigungu },
      select: { code: true, level: true, parentCode: true, depopulationArea: true },
    }),
    client.visaType.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: {
        code: true,
        nameKey: true,
        isStatusCode: true,
        registrable: true,
      },
    }),
  ]);
  const knownVisa = new Set(visaTypes.map((v) => v.code));
  if (
    !industry ||
    !sigungu ||
    sigungu.level !== "SIGUNGU" ||
    sigungu.parentCode !== values.sido ||
    values.foreignWorkers.some((row) => !knownVisa.has(row.visaCode))
  ) {
    return { ok: false, code: "INVALID_REFERENCE" };
  }

  const judged = visaTypes.filter((v) => v.isStatusCode && v.registrable);
  const rules = await client.visaRule.findMany({
    where: { status: "PUBLISHED", visaCode: { in: judged.map((v) => v.code) } },
  });
  const foreignTotal = values.foreignWorkers.reduce((sum, row) => sum + row.count, 0);
  const results: DiagnosisVisaResult[] = judged.map((visa) => {
    const same = values.foreignWorkers.find((row) => row.visaCode === visa.code)?.count ?? 0;
    const r = evaluateRules(
      {
        visaCode: visa.code,
        industryCode: values.industryCode,
        sido: values.sido,
        facts: {
          context: DIAGNOSIS_CONTEXT,
          sigungu: values.sigungu,
          depopulationArea: sigungu.depopulationArea,
          regularEmployees: values.regularEmployees,
          insuredDomestic: values.insuredDomestic,
          foreignWorkersTotal: foreignTotal,
          foreignWorkersOfVisa: same,
        },
      },
      rules,
    );
    return {
      code: visa.code,
      nameKey: visa.nameKey,
      isStatusCode: visa.isStatusCode,
      outcome: r.outcome,
      messageKey: r.messageKey,
      ruleId: r.ruleId,
    };
  });
  const result: DiagnosisResult = {
    groups: groupResults(results),
    needsReview: results.some((r) => r.messageKey === NEEDS_REVIEW_MESSAGE_KEY || !r.ruleId),
  };

  const answers: Prisma.InputJsonObject = {
    industryCode: values.industryCode,
    sido: values.sido,
    sigungu: values.sigungu,
    regularEmployees: values.regularEmployees,
    insuredDomestic: values.insuredDomestic,
    foreignWorkers: values.foreignWorkers.map((r) => ({ visaCode: r.visaCode, count: r.count })),
  };
  const diagnosisJson: Prisma.InputJsonObject = {
    answers,
    results: results.map((r) => ({
      visaCode: r.code,
      outcome: r.outcome,
      messageKey: r.messageKey,
      ruleId: r.ruleId,
    })),
    needsReview: result.needsReview,
    evaluatedAt: now.toISOString(),
  };
  const data = {
    source: DIAGNOSIS_SOURCE,
    companyId: options.companyId ?? null,
    industryCode: values.industryCode,
    sido: values.sido,
    sigungu: values.sigungu,
    depopulationArea: sigungu.depopulationArea,
    rawJson: answers,
    diagnosisJson,
  };

  const leadId = await client.$transaction(async (tx) => {
    if (!options.companyId) {
      const lead = await tx.jobLead.create({
        data: { ...data, sourceRef: `${DIAGNOSIS_SOURCE}:${randomUUID()}`, grade: "C" },
        select: { id: true },
      });
      return lead.id;
    }
    const sourceRef = `${DIAGNOSIS_SOURCE}:COMPANY:${options.companyId}`;
    const existing = await tx.jobLead.findUnique({
      where: { sourceRef },
      select: { id: true, grade: true },
    });
    if (!existing) {
      const lead = await tx.jobLead.create({
        data: { ...data, sourceRef, grade: "C" },
        select: { id: true },
      });
      return lead.id;
    }
    if (existing.grade === "ARCHIVED") {
      await transitionLead(tx, {
        leadId: existing.id,
        from: "ARCHIVED",
        to: "C",
        actorId: options.actorId ?? SYSTEM_ACTOR,
        reason: "DIAGNOSIS_REPEATED",
        now,
        data,
      });
    } else {
      await tx.jobLead.update({ where: { id: existing.id }, data });
    }
    return existing.id;
  });

  return { ok: true, result, leadId };
}
