"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { adminAction } from "@/lib/admin/actionGuard";
import { requireStaff } from "@/lib/admin/session";
import { assertCan } from "@/lib/rbac";
import {
  createScoreTable,
  createVisaRule,
  newScoreTableVersion,
  newVisaRuleVersion,
  publishScoreTable,
  publishVisaRule,
  retireScoreTable,
  retireVisaRule,
  updateScoreTableDraft,
  updateVisaRuleDraft,
} from "@/lib/rules/manage";
import { ruleIdSchema, scoreTableDraftSchema, visaRuleDraftSchema } from "@/schemas/admin/rules";

import type { AdminActionState } from "./seekers";

/**
 * 규칙 DB·점수표 관리 서버 액션 (R-215). First statement `requireStaff()` (staff + 2FA, STANDARD 4.5),
 * next statement `assertCan(actor, …)`: drafts need `rules:edit`, 게시·폐기 need `rules:publish`
 * (both STAFF_VISA·ADMIN = "STAFF_VISA 이상"; STAFF_PLACEMENT is refused with FORBIDDEN).
 * 게시 / 폐기 write AuditLog RULE_PUBLISH (src/lib/rules/manage.ts). Creating a draft or a new
 * version opens the new version's page.
 */
function form(fd: FormData, keys: string[]): Record<string, FormDataEntryValue | null> {
  return Object.fromEntries(keys.map((k) => [k, fd.get(k) ?? ""]));
}

function doneRules(id?: string): AdminActionState {
  revalidatePath("/admin/rules");
  if (id) revalidatePath(`/admin/rules/${id}`);
  return { ok: true, at: Date.now() };
}

function doneTables(id?: string): AdminActionState {
  revalidatePath("/admin/score-tables");
  if (id) revalidatePath(`/admin/score-tables/${id}`);
  return { ok: true, at: Date.now() };
}

const RULE_FIELDS = ["visaCode", "industryCode", "outcome", "messageKey", "conditions"];
const TABLE_FIELDS = ["name", "passScore", "items"];

export const createVisaRuleAction = adminAction(async function createVisaRuleAction(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "rules:edit");
  const parsed = visaRuleDraftSchema.safeParse(form(fd, RULE_FIELDS));
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const r = await createVisaRule(parsed.data);
  if (!r.ok) return { ok: false, code: r.code };
  doneRules();
  redirect(`/admin/rules/${r.id}`);
});

export const updateVisaRuleAction = adminAction(async function updateVisaRuleAction(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "rules:edit");
  const id = ruleIdSchema.safeParse({ id: fd.get("id") });
  const parsed = visaRuleDraftSchema.safeParse(form(fd, RULE_FIELDS));
  if (!id.success || !parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const r = await updateVisaRuleDraft(id.data.id, parsed.data);
  return r.ok ? doneRules(id.data.id) : { ok: false, code: r.code };
});

export const newVisaRuleVersionAction = adminAction(async function newVisaRuleVersionAction(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "rules:edit");
  const id = ruleIdSchema.safeParse({ id: fd.get("id") });
  if (!id.success) return { ok: false, code: "INVALID_INPUT" };
  const r = await newVisaRuleVersion(id.data.id);
  if (!r.ok) return { ok: false, code: r.code };
  doneRules(id.data.id);
  redirect(`/admin/rules/${r.id}`);
});

export const publishVisaRuleAction = adminAction(async function publishVisaRuleAction(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "rules:publish");
  const id = ruleIdSchema.safeParse({ id: fd.get("id") });
  if (!id.success) return { ok: false, code: "INVALID_INPUT" };
  const r = await publishVisaRule({ actorId: actor.id, id: id.data.id });
  if (!r.ok) return { ok: false, code: r.code };
  for (const retired of r.retiredIds) revalidatePath(`/admin/rules/${retired}`);
  return doneRules(id.data.id);
});

export const retireVisaRuleAction = adminAction(async function retireVisaRuleAction(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "rules:publish");
  const id = ruleIdSchema.safeParse({ id: fd.get("id") });
  if (!id.success) return { ok: false, code: "INVALID_INPUT" };
  const r = await retireVisaRule({ actorId: actor.id, id: id.data.id });
  return r.ok ? doneRules(id.data.id) : { ok: false, code: r.code };
});

export const createScoreTableAction = adminAction(async function createScoreTableAction(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "rules:edit");
  const parsed = scoreTableDraftSchema.safeParse(form(fd, TABLE_FIELDS));
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const r = await createScoreTable(parsed.data);
  if (!r.ok) return { ok: false, code: r.code };
  doneTables();
  redirect(`/admin/score-tables/${r.id}`);
});

export const updateScoreTableAction = adminAction(async function updateScoreTableAction(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "rules:edit");
  const id = ruleIdSchema.safeParse({ id: fd.get("id") });
  // The name is fixed for a version (versions of one table share it); only items / pass score change.
  const parsed = scoreTableDraftSchema.safeParse({ ...form(fd, TABLE_FIELDS), name: "KEEP" });
  if (!id.success || !parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const r = await updateScoreTableDraft(id.data.id, parsed.data);
  return r.ok ? doneTables(id.data.id) : { ok: false, code: r.code };
});

export const newScoreTableVersionAction = adminAction(async function newScoreTableVersionAction(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "rules:edit");
  const id = ruleIdSchema.safeParse({ id: fd.get("id") });
  if (!id.success) return { ok: false, code: "INVALID_INPUT" };
  const r = await newScoreTableVersion(id.data.id);
  if (!r.ok) return { ok: false, code: r.code };
  doneTables(id.data.id);
  redirect(`/admin/score-tables/${r.id}`);
});

export const publishScoreTableAction = adminAction(async function publishScoreTableAction(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "rules:publish");
  const id = ruleIdSchema.safeParse({ id: fd.get("id") });
  if (!id.success) return { ok: false, code: "INVALID_INPUT" };
  const r = await publishScoreTable({ actorId: actor.id, id: id.data.id });
  if (!r.ok) return { ok: false, code: r.code };
  for (const retired of r.retiredIds) revalidatePath(`/admin/score-tables/${retired}`);
  return doneTables(id.data.id);
});

export const retireScoreTableAction = adminAction(async function retireScoreTableAction(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "rules:publish");
  const id = ruleIdSchema.safeParse({ id: fd.get("id") });
  if (!id.success) return { ok: false, code: "INVALID_INPUT" };
  const r = await retireScoreTable({ actorId: actor.id, id: id.data.id });
  return r.ok ? doneTables(id.data.id) : { ok: false, code: r.code };
});
