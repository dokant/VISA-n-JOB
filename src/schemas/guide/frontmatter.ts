import { z } from "zod";

/** content/guide/{slug}.{locale}.mdx frontmatter (WO §13, R-131): reviewedBy and updatedAt required. */
export const guideFrontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  reviewedBy: z.string().min(1),
  updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  faq: z.array(z.object({ q: z.string().min(1), a: z.string().min(1) })).default([]),
});

export type GuideFrontmatter = z.infer<typeof guideFrontmatterSchema>;
