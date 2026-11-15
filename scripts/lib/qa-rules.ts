/**
 * Static BR checks (PLAN common rule 4, STANDARD 1.2 / 4.9 / 6).
 * A grep-level safety net. Final judgment is human / QA code review.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export type Severity = "error" | "warn";

export type Rule = {
  id: string;
  severity: Severity;
  description: string;
  /** Directories (relative to repo root) to scan. */
  roots: string[];
  /** Only files whose repo-relative POSIX path matches. */
  fileFilter?: RegExp;
  /** Files (repo-relative POSIX path) that are exempt. */
  allow?: RegExp[];
  /** Line pattern. */
  pattern: RegExp;
  /** Skip lines that are only comments. */
  skipComments?: boolean;
};

export type Hit = { rule: Rule; file: string; line: number; text: string };

const CODE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const CODE_OR_PRISMA = /\.(ts|tsx|js|jsx|mjs|cjs|prisma|sql)$/;

/**
 * Operator-contact / referral-share files allowed to contain tel:/mailto:/messenger URLs.
 * BR-01 forbids seeker<->employer contact; contacting the operator (footer) and sharing a referral
 * link with friends (DECISIONS PC-9) are allowed. Keep this list short and reviewed.
 */
export const OPERATOR_CONTACT_ALLOWLIST: RegExp[] = [
  /^src\/config\/site\.config\.ts$/,
  /^src\/components\/common\/site-footer\.tsx$/,
  /^src\/components\/common\/site-nav\.tsx$/,
  /^src\/components\/home\/final-cta\.tsx$/,
  /^src\/components\/seeker\/referral-share\.tsx$/,
];

export const RULES: Rule[] = [
  {
    id: "BR-13/identifier-fields",
    severity: "error",
    description: "No resident / alien registration / passport number fields (BR-13)",
    roots: ["src", "prisma"],
    fileFilter: CODE_OR_PRISMA,
    pattern:
      /passport|alienReg|arcNo\b|arcNumber|residentNo|residentRegistration|foreignerRegistration|registrationNumber/i,
  },
  {
    id: "BR-01/direct-contact-links",
    severity: "error",
    description:
      "No tel:/mailto:/messenger deep links outside the operator-contact allowlist (BR-01)",
    roots: ["src"],
    fileFilter: CODE,
    allow: OPERATOR_CONTACT_ALLOWLIST,
    pattern: /tel:|mailto:|wa\.me\/|t\.me\/|zalo\.me|open\.kakao|kakaotalk:|viber:\/\/|line\.me\//i,
  },
  {
    id: "BR-01/chat-ui",
    severity: "warn",
    description: "Chat / direct message UI or API names: review (BR-01)",
    roots: ["src"],
    fileFilter: CODE,
    pattern: /\b(Chat[A-Z]\w*|\w*ChatRoom|DirectMessage\w*|sendMessageTo\w*|revealContact\w*)\b/,
  },
  {
    id: "BR-09/ledger-mutation",
    severity: "error",
    description: "Recommendation / AuditLog are append-only: no update/delete/upsert (BR-09)",
    roots: ["src"],
    fileFilter: CODE,
    pattern: /\b(recommendation|auditLog)\.(update|updateMany|delete|deleteMany|upsert)\s*\(/i,
  },
  {
    id: "BR-12/visa-code-literal",
    severity: "error",
    description: "No visa code string literals in src (BR-12, STANDARD 4.9-1)",
    roots: ["src"],
    fileFilter: CODE,
    pattern: /['"`][A-H]-[0-9]{1,2}(-[0-9A-Z]{1,2})?['"`]/,
  },
  {
    id: "BR-12/engine-numbers",
    severity: "error",
    description:
      "No multi-digit numeric literals in visa-engine / score modules (BR-12, STANDARD 4.9-2)",
    roots: ["src/lib/visa-engine", "src/lib/score"],
    fileFilter: CODE,
    skipComments: true,
    pattern: /\b[0-9]{2,}\b/,
  },
  {
    id: "BR-12/mapping-constant",
    severity: "warn",
    description: "Possible visa mapping constant: review manually (STANDARD 4.9-3)",
    roots: ["src/lib/visa-engine"],
    fileFilter: CODE,
    pattern: /(Record<|Map<|switch\s*\().*visa/i,
  },
  {
    id: "WO13/jobposting-schema",
    severity: "error",
    description: "schema.org JobPosting must not be emitted (WO §13)",
    roots: ["src"],
    fileFilter: CODE,
    pattern: /['"`]JobPosting['"`]/,
  },
  {
    id: "S-10/avatar",
    severity: "error",
    description: "shadcn avatar is forbidden (BR-02)",
    roots: ["src"],
    fileFilter: CODE,
    pattern: /components\/ui\/avatar/,
  },
  {
    id: "S-02/hardcoded-color",
    severity: "error",
    description: "No hard-coded colors outside globals.css / brand.css (STANDARD v2 2.1.4, S-02)",
    roots: ["src"],
    fileFilter: /\.(ts|tsx|css)$/,
    allow: [/^src\/app\/globals\.css$/, /^src\/app\/brand\.css$/],
    skipComments: true,
    pattern:
      /#[0-9a-fA-F]{3,8}\b(?![-\w])|rgba?\(|\b(text|bg|border|ring|fill|stroke|from|to|via)-(red|green|yellow|blue|slate|gray|zinc|neutral|stone|amber|orange|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}\b/,
  },
  {
    id: "S-06/arbitrary-spacing",
    severity: "error",
    description:
      "No arbitrary spacing/radius values; shadows only from the STANDARD v2 2.5 list (S-06)",
    roots: ["src"],
    fileFilter: /\.(tsx|ts)$/,
    pattern:
      /\b(p|px|py|pt|pb|pl|pr|ps|pe|m|mx|my|mt|mb|ml|mr|ms|me|gap|gap-x|gap-y|space-x|space-y|rounded|rounded-[trblse]{1,2})-\[|\bshadow-(sm|md|lg|xs|xl|2xl|inner|\[)(?![-\w])/,
  },
  {
    id: "S-03/font-cdn",
    severity: "error",
    description: "Fonts load via next/font only; no CDN <link>/@import (STANDARD v2 2.3.3, S-03)",
    roots: ["src"],
    fileFilter: /\.(ts|tsx|css)$/,
    pattern: /jsdelivr|fonts\.googleapis|@import url\(.?https/,
  },
  {
    id: "S-36/any",
    severity: "error",
    description: "No `any` (STANDARD 4.1)",
    roots: ["src"],
    fileFilter: CODE,
    skipComments: true,
    pattern: /:\s*any\b|\bas any\b|<any>/,
  },
  {
    id: "S-23/forbidden-phrases",
    severity: "error",
    description: "Forbidden CTA / guarantee phrases in messages (STANDARD 3.5, SC-06)",
    roots: ["messages"],
    fileFilter: /\.json$/,
    pattern:
      /지원하기|바로 지원|입사 지원|apply now|"apply"|연락처 보기|메시지 보내기|비자 보장|합격 보장|반드시 가능|100%/i,
  },
  {
    id: "S-23/phrases-review",
    severity: "warn",
    description: "Phrases that need context review (채팅, 보장, 수수료, 소개비, 유료)",
    roots: ["messages"],
    fileFilter: /\.json$/,
    pattern: /채팅|보장|수수료|소개비|유료/,
  },
  {
    id: "S-45/console",
    severity: "warn",
    description: "console.* in app code: make sure no PII / OTP / secrets are logged",
    roots: ["src"],
    fileFilter: CODE,
    pattern: /console\.(log|info|warn|error|debug)\s*\(/,
  },
];

function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}

export function listFiles(rootDir: string, relRoot: string): string[] {
  const abs = path.join(rootDir, relRoot);
  if (!existsSync(abs)) return [];
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name === ".next") continue;
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else out.push(toPosix(path.relative(rootDir, full)));
    }
  };
  walk(abs);
  return out;
}

function isCommentLine(line: string): boolean {
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("/*") || t.startsWith("*");
}

export function scanText(rule: Rule, file: string, text: string): Hit[] {
  if (rule.fileFilter && !rule.fileFilter.test(file)) return [];
  if (rule.allow?.some((re) => re.test(file))) return [];
  const hits: Hit[] = [];
  text.split(/\r?\n/).forEach((line, i) => {
    if (rule.skipComments && isCommentLine(line)) return;
    if (rule.pattern.test(line)) hits.push({ rule, file, line: i + 1, text: line.trim() });
  });
  return hits;
}

function structuralRule(id: string, description: string): Rule {
  return { id, severity: "error", description, roots: ["src"], pattern: /(?!)/ };
}

/** Structural checks that are not line patterns. */
export function structuralHits(rootDir: string): Hit[] {
  const hits: Hit[] = [];
  const testInSrc = structuralRule("S-50/test-in-src", "Test files must live in tests/, not src/");
  for (const file of listFiles(rootDir, "src")) {
    if (/\.(test|spec)\.(ts|tsx)$/.test(file)) {
      hits.push({ rule: testInSrc, file, line: 0, text: "" });
    }
  }
  const forbiddenPaths: Array<[string, Rule]> = [
    [
      "src/components/ui/avatar.tsx",
      structuralRule("S-10/avatar-file", "shadcn avatar must not exist (BR-02)"),
    ],
    [
      "src/app/[locale]/agency",
      structuralRule("S-34/agency-route", "agency portal is Phase 3 (out of scope)"),
    ],
  ];
  for (const [rel, rule] of forbiddenPaths) {
    if (existsSync(path.join(rootDir, rel))) hits.push({ rule, file: rel, line: 0, text: "" });
  }
  return hits;
}

export function runRules(rootDir: string, rules: Rule[] = RULES): Hit[] {
  const hits: Hit[] = [];
  for (const rule of rules) {
    const files = new Set(rule.roots.flatMap((r) => listFiles(rootDir, r)));
    for (const file of files) {
      hits.push(...scanText(rule, file, readFileSync(path.join(rootDir, file), "utf8")));
    }
  }
  hits.push(...structuralHits(rootDir));
  return hits;
}
