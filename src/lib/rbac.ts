/**
 * Role × permission matrix (WO §1.3, §6.5, §11; PRD R-010; STANDARD 4.5).
 *
 * Server actions and Route Handlers check a permission name in their first statement
 * (`assertCan(session?.user, "contact:view")`). Ownership ("is this my profile / my company?") is
 * a separate check done by the caller; a permission only says the role may do this kind of thing.
 *
 * Key separations:
 * - STAFF_PLACEMENT may see contact details but not stay (visa) case details;
 *   STAFF_VISA is the reverse; ADMIN has both (WO §11 직원 권한 분리).
 * - ADMIN holds every staff permission and is the only role that reads the audit log.
 * - DECISIONS Q-08: `seeker:review` (구직자 등급·트랙 변경) is STAFF_VISA·ADMIN only; STAFF_PLACEMENT
 *   only views seekers (`seeker:view`). `company:verify` stays STAFF_PLACEMENT·ADMIN.
 * - AGENCY may only submit visa work requests — no seeker DB, postings or demand raw data (WO §9.5).
 * - EMPLOYER sees blind candidates only and never any contact detail (BR-01, BR-02, PC-1).
 * - Portal self-service permissions belong to the account type; staff act through staff permissions.
 */
import type { Role } from "@prisma/client";

export const ROLES = [
  "SEEKER",
  "EMPLOYER",
  "AGENCY",
  "STAFF_PLACEMENT",
  "STAFF_VISA",
  "ADMIN",
] as const satisfies readonly Role[];

export const STAFF_ROLES: readonly Role[] = ["STAFF_PLACEMENT", "STAFF_VISA", "ADMIN"];

export const PERMISSIONS = [
  // ── Portal: seeker ──
  "seeker:selfService", // own registration wizard, /seeker/me, own consents (R-105~R-113)
  "interest:requestBySeeker", // 면접 신청 (R-203)
  // ── Portal: employer ──
  "employer:selfService", // own company, diagnosis results, 구인 의뢰 (R-124, R-125, R-208)
  "candidates:view", // blind candidate list via blindSeeker.ts only (R-205)
  "interest:requestByEmployer", // 면접 요청 (R-207)
  // ── Portal: agency ──
  "agency:visaRequest", // 비자 업무 의뢰 only (WO §9.5)
  // ── Staff (admin area, 2FA required — R-118) ──
  "admin:access",
  "staffTask:view",
  "seeker:view", // internal seeker detail without contact fields
  "seeker:review", // grade / track change, conversion judgement (R-120)
  "contact:view", // decrypted phone / messenger / email of seekers and lead contacts
  "lead:manage", // lead kanban, call logs, lead grade transition (R-121)
  "company:verify", // verified / contractSignedAt (R-218)
  "posting:manage", // blind posting create / verify / publish (R-201)
  "recommendation:create", // ledger write (R-209)
  "interview:manage", // interview schedule (R-209)
  "placement:manage", // Placement contracts (R-216)
  "visaCase:view", // stay (visa) case detail (R-216)
  "visaCase:manage",
  "rules:edit", // VisaRule / ScoreTable drafts (R-215)
  "rules:publish", // DRAFT → PUBLISHED, STAFF_VISA 이상 (R-215)
  "audit:view", // ADMIN only (WO §6.5)
  "pii:export", // export function only, no UI (PC-14)
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const STAFF_COMMON: readonly Permission[] = ["admin:access", "staffTask:view", "seeker:view"];

const PLACEMENT_ONLY: readonly Permission[] = [
  "contact:view",
  "lead:manage",
  "company:verify",
  "posting:manage",
  "recommendation:create",
  "interview:manage",
  "placement:manage",
];

const VISA_ONLY: readonly Permission[] = [
  "seeker:review", // DECISIONS Q-08: 등급·트랙 변경은 STAFF_VISA·ADMIN만
  "visaCase:view",
  "visaCase:manage",
  "rules:edit",
  "rules:publish",
];

const ADMIN_ONLY: readonly Permission[] = ["audit:view", "pii:export"];

export const ROLE_PERMISSIONS: Readonly<Record<Role, ReadonlySet<Permission>>> = {
  SEEKER: new Set<Permission>(["seeker:selfService", "interest:requestBySeeker"]),
  EMPLOYER: new Set<Permission>([
    "employer:selfService",
    "candidates:view",
    "interest:requestByEmployer",
  ]),
  AGENCY: new Set<Permission>(["agency:visaRequest"]),
  STAFF_PLACEMENT: new Set<Permission>([...STAFF_COMMON, ...PLACEMENT_ONLY]),
  STAFF_VISA: new Set<Permission>([...STAFF_COMMON, ...VISA_ONLY]),
  ADMIN: new Set<Permission>([...STAFF_COMMON, ...PLACEMENT_ONLY, ...VISA_ONLY, ...ADMIN_ONLY]),
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function isStaff(role: Role | null | undefined): boolean {
  return role != null && STAFF_ROLES.includes(role);
}

export function permissionsOf(role: Role): Permission[] {
  return PERMISSIONS.filter((p) => ROLE_PERMISSIONS[role].has(p));
}

/** True when `role` holds `permission`. Unknown or missing roles never pass. */
export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!isRole(role)) return false;
  return ROLE_PERMISSIONS[role].has(permission);
}

/** Error shaped for the API error format (STANDARD 5): `{ error: { code, message } }`. */
export class AuthzError extends Error {
  constructor(
    readonly code: "UNAUTHENTICATED" | "FORBIDDEN",
    readonly status: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = "AuthzError";
  }

  toBody(): { error: { code: string; message: string } } {
    return { error: { code: this.code, message: this.message } };
  }
}

type Actor = { role: Role } | Role | null | undefined;

/**
 * Throws 401 when there is no actor, 403 when the role lacks the permission.
 * Call as the first statement of a server action / Route Handler (STANDARD 4.5).
 */
export function assertCan(actor: Actor, permission: Permission): void {
  const role = typeof actor === "string" ? actor : actor?.role;
  if (role == null) throw new AuthzError("UNAUTHENTICATED", 401, "sign-in required");
  if (!can(role, permission)) {
    throw new AuthzError("FORBIDDEN", 403, `missing permission ${permission}`);
  }
}
