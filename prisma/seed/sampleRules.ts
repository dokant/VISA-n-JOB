// SAMPLE — 실제 법령 수치 아님 (BR-12)
/**
 * VisaRule SAMPLE rows: they only show the *shape* of a rule (conditions JSON, outcome, messageKey).
 * Every value is an obvious placeholder: visaCode "SAMPLE-*", fields "sampleField*", values "SAMPLE_*".
 * No real visa requirement, allowed industry or score is encoded here. All rows: isSample=true,
 * status=DRAFT, so evaluate.ts (PUBLISHED only) never uses them.
 * TODO(행정사): real rules are entered and PUBLISHED from the admin rules screen (R-215, PLAN A-6).
 */
import type { Outcome, Prisma, PrismaClient } from "@prisma/client";

type SampleRule = {
  id: string;
  visaCode: string;
  industryCode: string | null;
  conditions: Prisma.InputJsonObject;
  outcome: Outcome;
  messageKey: string;
};

export const SAMPLE_RULES: SampleRule[] = [
  {
    id: "sample-rule-1",
    visaCode: "SAMPLE-1",
    industryCode: null,
    conditions: {
      __sample: true,
      all: [{ field: "sampleFieldA", op: "eq", value: "SAMPLE_VALUE" }],
    },
    outcome: "YELLOW",
    messageKey: "visa.rule.sample.placeholder",
  },
  {
    id: "sample-rule-2",
    visaCode: "SAMPLE-2",
    industryCode: "SAMPLE",
    conditions: {
      __sample: true,
      any: [
        { field: "sampleFieldB", op: "in", value: ["SAMPLE_X", "SAMPLE_Y"] },
        { field: "sampleFieldC", op: "exists" },
      ],
    },
    outcome: "YELLOW",
    messageKey: "visa.rule.sample.placeholder",
  },
];

export async function seedSampleRules(prisma: PrismaClient): Promise<number> {
  for (const r of SAMPLE_RULES) {
    await prisma.visaRule.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        visaCode: r.visaCode,
        industryCode: r.industryCode,
        conditions: r.conditions,
        outcome: r.outcome,
        messageKey: r.messageKey,
        version: 1,
        status: "DRAFT",
        isSample: true,
      },
      update: {},
    });
  }
  return SAMPLE_RULES.length;
}
