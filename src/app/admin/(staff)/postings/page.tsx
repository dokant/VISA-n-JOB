import type { Metadata } from "next";
import Link from "next/link";

import {
  LEAD_NO_COMPANY,
  LEAD_NO_TITLE,
  POSTING_STATUS_LABEL,
  fmtDate,
  fmtCount,
  fmtDateTime,
  fmtPeople,
} from "@/app/admin/_i18n/ko";
import { ForbiddenNotice } from "@/components/admin/forbidden-notice";
import { Badge } from "@/components/ui/badge";
import { requireStaff } from "@/lib/admin/session";
import { db } from "@/lib/db";
import { listAdminPostings, listPostableLeads } from "@/lib/postings/manage";
import { can } from "@/lib/rbac";

export const metadata: Metadata = { title: "블라인드 공고" };
export const dynamic = "force-dynamic";

const cell = "px-4 py-3 text-start align-top";
const linkClass =
  "inline-flex min-h-11 min-w-11 items-center font-semibold text-brand-blue-700 hover:underline";

/**
 * /admin/postings — 블라인드 공고 관리 (R-201). 공고는 리드 등급 A에서만 만든다(BR-05). 순서: 작성 →
 * 검증(검증자·검증 시각) → 공개(AuditLog POSTING_PUBLISH) → 마감. 권한 `posting:manage`.
 */
export default async function PostingsPage() {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  if (!can(actor.role, "posting:manage")) {
    return <ForbiddenNotice text="블라인드 공고는 매칭 담당 직원과 관리자만 관리합니다." />;
  }
  const [postings, leads, sidos] = await Promise.all([
    listAdminPostings(),
    listPostableLeads(),
    db.region.findMany({ where: { level: "SIDO" }, select: { code: true, nameKo: true } }),
  ]);
  const sidoName = new Map(sidos.map((r) => [r.code, r.nameKo]));

  return (
    <div className="grid gap-8" data-testid="admin-postings">
      <div className="grid gap-2">
        <h1 className="text-h2 text-navy">블라인드 공고</h1>
        <p className="text-dense text-n700">
          리드 등급 A(구인신청 + 직원 검증 완료) 리드에서만 만듭니다. 직원 검증을 기록해야 공개할 수
          있고, 공개하면 감사 로그가 남습니다. 공고 문구에는 회사 이름·주소·연락처를 넣지 않습니다.
        </p>
      </div>

      <section className="grid gap-3" aria-labelledby="postable-leads">
        <h2 id="postable-leads" className="text-ui font-semibold text-navy">
          공고를 만들 수 있는 리드 (리드 등급 A)
        </h2>
        {leads.length === 0 ? (
          <p className="text-dense text-n500">리드 등급 A 리드가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border bg-white shadow-1">
            <table
              className="w-full min-w-180 border-collapse text-dense"
              data-testid="postable-leads"
            >
              <thead className="bg-n50 text-label text-n700">
                <tr>
                  <th scope="col" className={cell}>
                    리드 (직원 전용)
                  </th>
                  <th scope="col" className={cell}>
                    지역
                  </th>
                  <th scope="col" className={cell}>
                    공고 수
                  </th>
                  <th scope="col" className={cell}>
                    작업
                  </th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-t border-n100" data-lead-id={l.id}>
                    <td className={cell}>
                      <span className="block text-navy">{l.title ?? LEAD_NO_TITLE}</span>
                      <span className="block text-caption text-n500">
                        {l.companyName ?? LEAD_NO_COMPANY}
                      </span>
                    </td>
                    <td className={cell}>{sidoName.get(l.sido) ?? l.sido}</td>
                    <td className={`${cell} tabular-nums`}>{fmtCount(l._count.postings, "건")}</td>
                    <td className={cell}>
                      <Link
                        href={`/admin/postings/new?leadId=${l.id}`}
                        className={linkClass}
                        data-testid="posting-new-link"
                      >
                        블라인드 공고 만들기
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-3" aria-labelledby="posting-list">
        <h2 id="posting-list" className="text-ui font-semibold text-navy">
          블라인드 공고 목록
        </h2>
        {postings.length === 0 ? (
          <p className="text-dense text-n500">아직 블라인드 공고가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border bg-white shadow-1">
            <table
              className="w-full min-w-180 border-collapse text-dense"
              data-testid="posting-table"
            >
              <thead className="bg-n50 text-label text-n700">
                <tr>
                  <th scope="col" className={cell}>
                    블라인드 제목
                  </th>
                  <th scope="col" className={cell}>
                    상태
                  </th>
                  <th scope="col" className={cell}>
                    검증
                  </th>
                  <th scope="col" className={cell}>
                    공개
                  </th>
                  <th scope="col" className={cell}>
                    채용 인원
                  </th>
                  <th scope="col" className={cell}>
                    면접 신청
                  </th>
                </tr>
              </thead>
              <tbody>
                {postings.map((p) => (
                  <tr key={p.id} className="border-t border-n100" data-posting-id={p.id}>
                    <td className={cell}>
                      <Link href={`/admin/postings/${p.id}`} className={linkClass}>
                        {p.blindTitle}
                      </Link>
                    </td>
                    <td className={cell}>
                      <Badge variant={p.status === "PUBLISHED" ? "cyan" : "neutral"}>
                        {POSTING_STATUS_LABEL[p.status]}
                      </Badge>
                    </td>
                    <td className={cell}>{p.verifiedAt ? fmtDateTime(p.verifiedAt) : "전"}</td>
                    <td className={cell}>{fmtDate(p.publishedAt)}</td>
                    <td className={`${cell} tabular-nums`}>{fmtPeople(p.headcount)}</td>
                    <td className={`${cell} tabular-nums`}>
                      {fmtCount(p._count.interestRequests, "건")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
