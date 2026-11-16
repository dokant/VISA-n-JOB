/**
 * Guide (비자 정보센터) MDX loader (R-131). Files: content/guide/{slug}.{locale}.mdx; a missing
 * locale falls back to ko. Frontmatter is validated (reviewedBy / updatedAt required, WO §13).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { compileMDX } from "next-mdx-remote/rsc";
import type { ReactElement } from "react";

import { defaultLocale } from "@/i18n/locales";
import { type GuideFrontmatter, guideFrontmatterSchema } from "@/schemas/guide/frontmatter";

const GUIDE_DIR = path.join(process.cwd(), "content", "guide");
const FILE = /^([a-z0-9-]+)\.([a-z]{2})\.mdx$/;

export function listGuideSlugs(): string[] {
  if (!existsSync(GUIDE_DIR)) return [];
  const slugs = new Set<string>();
  for (const name of readdirSync(GUIDE_DIR)) {
    const m = FILE.exec(name);
    if (m) slugs.add(m[1]);
  }
  return [...slugs].sort();
}

function guideFile(slug: string, locale: string): string | null {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  for (const l of [locale, defaultLocale]) {
    const file = path.join(GUIDE_DIR, `${slug}.${l}.mdx`);
    if (existsSync(file)) return file;
  }
  return null;
}

export type Guide = { slug: string; frontmatter: GuideFrontmatter; content: ReactElement };

export async function loadGuide(slug: string, locale: string): Promise<Guide | null> {
  const file = guideFile(slug, locale);
  if (!file) return null;
  const source = readFileSync(file, "utf8");
  const { content, frontmatter } = await compileMDX<Record<string, unknown>>({
    source,
    options: { parseFrontmatter: true },
  });
  return { slug, frontmatter: guideFrontmatterSchema.parse(frontmatter), content };
}

/** Frontmatter only (for the guide index). */
export async function loadGuideMeta(
  slug: string,
  locale: string,
): Promise<GuideFrontmatter | null> {
  const guide = await loadGuide(slug, locale);
  return guide?.frontmatter ?? null;
}
