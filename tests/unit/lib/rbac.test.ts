/**
 * R-010: role × permission matrix (WO §1.3, §11 직원 권한 분리).
 */
import { describe, expect, it } from "vitest";

import {
  AuthzError,
  PERMISSIONS,
  ROLES,
  ROLE_PERMISSIONS,
  STAFF_ROLES,
  assertCan,
  can,
  isRole,
  isStaff,
  permissionsOf,
} from "@/lib/rbac";

describe("R-010 rbac", () => {
  it("R-010: STAFF_PLACEMENT may view contacts but not stay (visa) cases", () => {
    expect(can("STAFF_PLACEMENT", "contact:view")).toBe(true);
    expect(can("STAFF_PLACEMENT", "visaCase:view")).toBe(false);
    expect(can("STAFF_PLACEMENT", "visaCase:manage")).toBe(false);
    expect(() => assertCan("STAFF_PLACEMENT", "visaCase:view")).toThrow(AuthzError);
  });

  it("R-010: STAFF_VISA is the reverse — stay cases yes, contacts no", () => {
    expect(can("STAFF_VISA", "visaCase:view")).toBe(true);
    expect(can("STAFF_VISA", "visaCase:manage")).toBe(true);
    expect(can("STAFF_VISA", "contact:view")).toBe(false);
    expect(() => assertCan({ role: "STAFF_VISA" }, "contact:view")).toThrow(/contact:view/);
  });

  it("R-010: ADMIN may do both, and holds every staff permission", () => {
    expect(can("ADMIN", "contact:view")).toBe(true);
    expect(can("ADMIN", "visaCase:view")).toBe(true);
    for (const p of [...ROLE_PERMISSIONS.STAFF_PLACEMENT, ...ROLE_PERMISSIONS.STAFF_VISA]) {
      expect(can("ADMIN", p)).toBe(true);
    }
    expect(() => assertCan({ role: "ADMIN" }, "visaCase:view")).not.toThrow();
  });

  it("audit log and PII export are ADMIN only (WO §6.5, PC-14)", () => {
    for (const role of ROLES) {
      expect(can(role, "audit:view")).toBe(role === "ADMIN");
      expect(can(role, "pii:export")).toBe(role === "ADMIN");
    }
  });

  it("rules publish is STAFF_VISA 이상 (R-215)", () => {
    expect(ROLES.filter((r) => can(r, "rules:publish"))).toEqual(["STAFF_VISA", "ADMIN"]);
  });

  it("AGENCY may only submit visa work requests (WO §1.3, §9.5)", () => {
    expect(permissionsOf("AGENCY")).toEqual(["agency:visaRequest"]);
    for (const p of ["candidates:view", "seeker:view", "contact:view", "lead:manage"] as const) {
      expect(can("AGENCY", p)).toBe(false);
    }
    expect(ROLES.filter((r) => can(r, "agency:visaRequest"))).toEqual(["AGENCY"]);
  });

  it("EMPLOYER sees blind candidates only, never contacts or internal seeker data (BR-01/02, PC-1)", () => {
    expect(can("EMPLOYER", "candidates:view")).toBe(true);
    for (const p of ["contact:view", "seeker:view", "visaCase:view", "admin:access"] as const) {
      expect(can("EMPLOYER", p)).toBe(false);
    }
    expect(ROLES.filter((r) => can(r, "candidates:view"))).toEqual(["EMPLOYER"]);
  });

  it("SEEKER has portal self-service only; contact:view is never granted to a portal role", () => {
    expect(permissionsOf("SEEKER")).toEqual(["seeker:selfService", "interest:requestBySeeker"]);
    for (const role of ["SEEKER", "EMPLOYER", "AGENCY"] as const) {
      expect(can(role, "contact:view")).toBe(false);
      expect(can(role, "admin:access")).toBe(false);
      expect(isStaff(role)).toBe(false);
    }
  });

  it("every staff role can enter the admin area; every permission is granted to some role", () => {
    for (const role of STAFF_ROLES) {
      expect(can(role, "admin:access")).toBe(true);
      expect(isStaff(role)).toBe(true);
    }
    for (const p of PERMISSIONS) expect(ROLES.some((r) => can(r, p))).toBe(true);
  });

  it("unknown / missing roles never pass; assertCan maps to 401 / 403 API errors", () => {
    expect(can(null, "seeker:selfService")).toBe(false);
    expect(can(undefined, "seeker:selfService")).toBe(false);
    expect(can("ROOT" as never, "audit:view")).toBe(false);
    expect(isRole("ADMIN")).toBe(true);
    expect(isRole("ROOT")).toBe(false);
    expect(isRole(1)).toBe(false);
    expect(isStaff(null)).toBe(false);

    try {
      assertCan(null, "seeker:selfService");
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(AuthzError);
      expect((e as AuthzError).status).toBe(401);
      expect((e as AuthzError).toBody()).toEqual({
        error: { code: "UNAUTHENTICATED", message: "sign-in required" },
      });
    }
    try {
      assertCan({ role: "SEEKER" }, "audit:view");
      expect.unreachable();
    } catch (e) {
      expect((e as AuthzError).status).toBe(403);
      expect((e as AuthzError).toBody().error.code).toBe("FORBIDDEN");
    }
    expect(() => assertCan(undefined, "audit:view")).toThrow(/sign-in/);
  });
});
