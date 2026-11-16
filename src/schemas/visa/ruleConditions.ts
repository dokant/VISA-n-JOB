import { z } from "zod";

/**
 * VisaRule.conditions JSON — structure only (PLAN P1a-2, WO §10).
 * The schema describes *how* a rule is written, never *what* the legal requirement is (BR-12).
 * Real values are entered and PUBLISHED by the 행정사 in the admin rules screen (R-215).
 *
 * A node is either a leaf `{ field, op, value? }` or a group `{ all: [...] }`, `{ any: [...] }`,
 * `{ not: node }`. The top level is a group object; extra metadata keys (e.g. `__sample`) are kept.
 * An empty top level (no all / any / not) matches every input of the rule's visa / industry.
 */
export const CONDITION_OPS = [
  "eq",
  "neq",
  "in",
  "notIn",
  "exists",
  "notExists",
  "gt",
  "gte",
  "lt",
  "lte",
] as const;

export type ConditionOp = (typeof CONDITION_OPS)[number];

export type ConditionScalar = string | number | boolean;
export type ConditionValue = ConditionScalar | Array<string | number>;

export type ConditionLeaf = { field: string; op: ConditionOp; value?: ConditionValue };
export type ConditionNode =
  ConditionLeaf | { all: ConditionNode[] } | { any: ConditionNode[] } | { not: ConditionNode };

const conditionValueSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.array(z.union([z.string(), z.number().finite()])),
]);

export const conditionLeafSchema = z.object({
  field: z.string().min(1),
  op: z.enum(CONDITION_OPS),
  value: conditionValueSchema.optional(),
});

export const conditionNodeSchema: z.ZodType<ConditionNode> = z.lazy(() =>
  z.union([
    conditionLeafSchema,
    z.object({ all: z.array(conditionNodeSchema) }),
    z.object({ any: z.array(conditionNodeSchema) }),
    z.object({ not: conditionNodeSchema }),
  ]),
);

export const ruleConditionsSchema = z
  .object({
    all: z.array(conditionNodeSchema).optional(),
    any: z.array(conditionNodeSchema).optional(),
    not: conditionNodeSchema.optional(),
  })
  .passthrough();

export type RuleConditions = z.infer<typeof ruleConditionsSchema>;
