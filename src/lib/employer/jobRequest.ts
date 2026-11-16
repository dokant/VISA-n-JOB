/**
 * 구인 의뢰서 제출 (R-125, WO §9.2, WO §8.2, BR-01, BR-14, BR-15).
 *
 * On submit, in one transaction:
 * 1. Company: name (`nameEnc`, encrypted by the db extension), 시·군·구, 상시근로자 수.
 * 2. Lead: the company's latest lead in C or ARCHIVED (e.g. its own diagnosis lead, or a collected
 *    lead staff linked to it) is moved to B; without one a new lead (source REQUEST) is created at B.
 *    DO_NOT_CONTACT / B / A leads are never reused — a new request is a new lead.
 *    The request details go to `requestJson` (pii-guard checked values only); the contact person to
 *    `contactNameEnc` / `contactPhoneEnc` / `contactEmailEnc` (+ `contactPhoneHash`), staff only.
 * 3. AuditLog LEAD_GRADE_CHANGE (C/ARCHIVED → B, or new → B).
 * 4. StaffTask LEAD_REVIEW for STAFF_PLACEMENT: the staff verification queue (검증 큐).
 * The values were parsed with `jobRequestSchema` (free text has no contact pattern).
 */
import { randomUUID } from "node:crypto";

import type { LeadGrade, Prisma } from "@prisma/client";

import { JOB_REQUEST_LIST_MAX } from "@/config/limits";
import { db } from "@/lib/db";
import { auditLeadCreatedAt, transitionLead } from "@/lib/leads/transitions";
import { phoneHashOf } from "@/lib/otp";
import { normalizePhone } from "@/lib/phone";
import type { JobRequestValues } from "@/schemas/employer/request";

import type { EmployerActor } from "./session";

export const REQUEST_SOURCE = "REQUEST";

export type JobRequestResult =
  | { ok: true; leadId: string; linked: boolean }
  | { ok: false; code: "INVALID_REFERENCE" | "NO_COMPANY" };

const LINKABLE: readonly LeadGrade[] = ["C", "ARCHIVED"];

export async function submitJobRequest(
  actor: EmployerActor,
  values: JobRequestValues,
  now: Date = new Date(),
  client: typeof db = db,
): Promise<JobRequestResult> {
  const [company, sigungu] = await Promise.all([
    client.company.findUnique({
      where: { id: actor.companyId },
      select: { id: true, industryCode: true },
    }),
    client.region.findUnique({
      where: { code: values.sigungu },
      select: { level: true, parentCode: true, depopulationArea: true },
    }),
  ]);
  if (!company) return { ok: false, code: "NO_COMPANY" };
  if (!sigungu || sigungu.level !== "SIGUNGU" || sigungu.parentCode !== values.sido) {
    return { ok: false, code: "INVALID_REFERENCE" };
  }

  const phone = normalizePhone(values.contactPhone) as string; // checked by the schema
  const requestJson: Prisma.InputJsonObject = {
    role: values.role,
    payMin: values.payMin,
    payMax: values.payMax ?? null,
    workHours: values.workHours,
    overtime: values.overtime,
    headcount: values.headcount,
    startTiming: values.startTiming,
    dormitory: values.dormitory,
    meals: values.meals,
    preferences: values.preferences,
    detail: values.detail,
    employeeCount: values.employeeCount,
  };
  const leadData = {
    companyId: company.id,
    industryCode: company.industryCode,
    sido: values.sido,
    sigungu: values.sigungu,
    depopulationArea: sigungu.depopulationArea,
    title: values.role,
    payMin: values.payMin,
    payMax: values.payMax ?? null,
    requestJson,
    requestedAt: now,
    contactNameEnc: values.contactName,
    contactPhoneEnc: phone,
    contactPhoneHash: phoneHashOf(phone),
    contactEmailEnc: values.contactEmail || null,
  };

  return client.$transaction(async (tx) => {
    await tx.company.update({
      where: { id: company.id },
      data: {
        nameEnc: values.companyName,
        sido: values.sido,
        sigungu: values.sigungu,
        employeeCount: values.employeeCount,
      },
    });

    const existing = await tx.jobLead.findFirst({
      where: { companyId: company.id, grade: { in: [...LINKABLE] } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, grade: true },
    });

    let leadId: string;
    let linked = false;
    if (existing) {
      const moved = await transitionLead(tx, {
        leadId: existing.id,
        from: existing.grade,
        to: "B",
        actorId: actor.id,
        reason: "JOB_REQUEST",
        now,
        data: leadData,
      });
      linked = moved;
      leadId = existing.id;
    } else {
      leadId = "";
    }
    if (!linked) {
      const lead = await tx.jobLead.create({
        data: {
          ...leadData,
          source: REQUEST_SOURCE,
          sourceRef: `${REQUEST_SOURCE}:${randomUUID()}`,
          grade: "B",
          rawJson: requestJson,
        },
        select: { id: true },
      });
      leadId = lead.id;
      await auditLeadCreatedAt(tx, {
        leadId,
        grade: "B",
        actorId: actor.id,
        reason: "JOB_REQUEST",
      });
    }

    await tx.staffTask.create({
      data: {
        type: "LEAD_REVIEW",
        assigneeRole: "STAFF_PLACEMENT",
        companyId: company.id,
        leadId,
        dedupeKey: `LEAD_REVIEW:${REQUEST_SOURCE}:${leadId}:${now.getTime()}`,
        payload: { source: REQUEST_SOURCE },
      },
    });
    return { ok: true as const, leadId, linked };
  });
}

/** The company's requests for the 구인 의뢰 page ("검토 중" / "검증 완료"). No contact values. */
export async function listCompanyRequests(companyId: string, client: typeof db = db) {
  return client.jobLead.findMany({
    where: { companyId, requestedAt: { not: null } },
    orderBy: { requestedAt: "desc" },
    take: JOB_REQUEST_LIST_MAX,
    select: { id: true, title: true, grade: true, requestedAt: true, payMin: true, payMax: true },
  });
}
