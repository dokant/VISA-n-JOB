import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import {
  CALL_OUTCOME_LABEL,
  LEAD_GRADE_LABEL,
  LEAD_NO_COMPANY,
  LEAD_NO_TITLE,
  LEAD_SOURCE_LABEL,
  ROLE_LABEL,
  fmtDate,
  fmtDateTime,
  fmtWon,
} from "@/app/admin/_i18n/ko";
import { ForbiddenNotice } from "@/components/admin/forbidden-notice";
import { LeadCallForm, VerifyLeadForm } from "@/components/admin/lead-call-form";
import { LeadContactReveal } from "@/components/admin/pii-reveal";
import { Badge } from "@/components/ui/badge";
import { getLeadDetail } from "@/lib/admin/leadDesk";
import { requireStaff } from "@/lib/admin/session";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { isCallOutcome } from "@/schemas/admin/leads";

export const metadata: Metadata = { title: "리드 상세" };
export const dynamic = "force-dynamic";

function Section({ title, children, id }: { title: string; children: ReactNode; id: string }) {
  return (
    <section
      className="grid content-start gap-4 rounded-md border border-border bg-white p-6 shadow-1"
      aria-labelledby={id}
    >
      <h2 id={id} className="text-ui font-semibold text-navy">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5">
      <dt className="text-dense text-n700">{label}</dt>
      <dd className="col-span-2 text-dense break-words text-navy">{value}</dd>
    </div>
  );
}

/** Flat key → value rows of the 구인 의뢰 / 진단 JSON (already pii-guard checked, P1d). */
function jsonRows(value: unknown): [string, string][] {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => [k, typeof v === "object" ? JSON.stringify(v) : String(v)]);
}

/** /admin/leads/[id] — 리드 상세, 통화 기록(R-121), 연락처 열람(R-122). */
export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  if (!can(actor.role, "lead:manage")) {
    return <ForbiddenNotice text="리드는 매칭 담당 직원과 관리자만 볼 수 있습니다." />;
  }
  const { id } = await params;
  const lead = await getLeadDetail(id);
  if (!lead) notFound();
  const [region, industry] = await Promise.all([
    db.region.findUnique({ where: { code: lead.sido }, select: { nameKo: true } }),
    lead.industryCode
      ? db.industry.findUnique({ where: { code: lead.industryCode }, select: { nameKo: true } })
      : Promise.resolve(null),
  ]);
  const dnc = lead.grade === "DO_NOT_CONTACT";
  const request = jsonRows(lead.requestJson);

  return (
    <div className="grid gap-6" data-testid="lead-detail">
      <div className="grid gap-2">
        <Link
          href="/admin/leads"
          className="inline-flex min-h-11 items-center text-dense text-n700 hover:text-navy"
        >
          ← 리드 칸반
        </Link>
        <h1 className="text-h2 text-navy">{lead.title ?? LEAD_NO_TITLE}</h1>
        <p className="flex flex-wrap items-center gap-2 text-dense text-n700">
          <span>{lead.companyName ?? LEAD_NO_COMPANY}</span>
          <Badge variant="solid" data-testid="lead-grade" data-grade={lead.grade}>
            리드 등급 {LEAD_GRADE_LABEL[lead.grade]}
          </Badge>
          <Badge variant="blue">대기 인력 {lead.waiting}명</Badge>
          <Badge variant="neutral">우선순위 {lead.priority}</Badge>
          {lead.openReview ? <Badge variant="orange">검증 대기</Badge> : null}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="리드 정보" id="lead-info">
          <dl className="divide-y divide-n100">
            <Field label="출처" value={LEAD_SOURCE_LABEL[lead.source] ?? lead.source} />
            <Field
              label="지역"
              value={`${region?.nameKo ?? lead.sido}${lead.depopulationArea ? " (인구감소지역)" : ""}`}
            />
            <Field label="업종" value={industry?.nameKo ?? lead.industryCode ?? "—"} />
            <Field label="급여" value={`${fmtWon(lead.payMin)} ~ ${fmtWon(lead.payMax)}`} />
            <Field label="게시일" value={fmtDate(lead.postedAt)} />
            <Field label="마감일" value={fmtDate(lead.closesAt)} />
            <Field label="수집일" value={fmtDateTime(lead.createdAt)} />
            <Field
              label="구인신청"
              value={lead.requestedAt ? fmtDateTime(lead.requestedAt) : "없음"}
            />
            <Field
              label="고용 의사"
              value={lead.foreignIntent == null ? "모름" : lead.foreignIntent ? "있음" : "없음"}
            />
            <Field label="최근 연락" value={fmtDateTime(lead.lastContactedAt)} />
            <Field label="다음 연락 예정" value={fmtDate(lead.nextActionAt)} />
          </dl>
          <p className="text-caption text-n500">
            우선순위 내역: 대기 인력 {lead.parts.match} + 인구감소지역 {lead.parts.depopulation} +
            신규 {lead.parts.newness}
          </p>
        </Section>

        <Section title="기업 담당자 연락처" id="lead-contact-title">
          {can(actor.role, "contact:view") ? (
            <LeadContactReveal leadId={lead.id} />
          ) : (
            <p className="text-caption text-n500">연락처 열람 권한이 없습니다.</p>
          )}
        </Section>

        <Section title="통화 기록" id="lead-call-title">
          {dnc ? (
            <p className="text-dense text-n700">재접촉금지 리드입니다. 전화하지 않습니다.</p>
          ) : (
            <LeadCallForm leadId={lead.id} />
          )}
          {lead.grade === "B" ? (
            <div className="grid gap-2 border-t border-n100 pt-4">
              <p className="text-dense text-n700">
                구인신청이 접수되고 직원이 내용을 확인했으면 A(공고 가능)로 바꿉니다.
              </p>
              <VerifyLeadForm leadId={lead.id} />
            </div>
          ) : null}
        </Section>

        <Section title="통화 이력" id="lead-history-title">
          {lead.callLogs.length === 0 ? (
            <p className="text-dense text-n500">아직 통화 기록이 없습니다.</p>
          ) : (
            <ol className="grid gap-3" data-testid="call-history">
              {lead.callLogs.map((c) => (
                <li key={c.id} className="grid gap-0.5 border-b border-n100 pb-3">
                  <span className="text-dense font-semibold text-navy" data-testid="call-outcome">
                    {isCallOutcome(c.outcome) ? CALL_OUTCOME_LABEL[c.outcome] : c.outcome}
                  </span>
                  <span className="text-caption text-n500">
                    {fmtDateTime(c.at)} · {c.staff.displayName ?? "직원"} (
                    {ROLE_LABEL[c.staff.role]})
                  </span>
                  {c.note ? <span className="text-dense text-n700">{c.note}</span> : null}
                </li>
              ))}
            </ol>
          )}
        </Section>

        {request.length > 0 ? (
          <Section title="구인 의뢰 내용" id="lead-request-title">
            <dl className="divide-y divide-n100">
              {request.map(([k, v]) => (
                <Field key={k} label={k} value={v} />
              ))}
            </dl>
          </Section>
        ) : null}
      </div>
    </div>
  );
}
