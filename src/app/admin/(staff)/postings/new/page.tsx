import type { Metadata } from "next";
import Link from "next/link";

import { LEAD_GRADE_LABEL, LEAD_NO_COMPANY, LEAD_NO_TITLE } from "@/app/admin/_i18n/ko";
import { ForbiddenNotice } from "@/components/admin/forbidden-notice";
import { PostingCreateForm } from "@/components/admin/posting-forms";
import { requireStaff } from "@/lib/admin/session";
import { db } from "@/lib/db";
import { postingPrefill } from "@/lib/postings/manage";
import { can } from "@/lib/rbac";

export const metadata: Metadata = { title: "블라인드 공고 만들기" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ leadId?: string | string[] }> };

/**
 * /admin/postings/new?leadId= — 리드 등급 A 리드에서 블라인드 공고 작성 (R-201). 화면은 리드의 지역·업종·
 * 급여·채용 인원만 미리 채운다. 리드 제목·회사명은 참고로만 보여 주고 공고 문구로 옮기지 않는다(BR-03).
 * 등급 검사는 서버 액션이 다시 한다(BR-05).
 */
export default async function NewPostingPage({ searchParams }: Props) {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  if (!can(actor.role, "posting:manage")) {
    return <ForbiddenNotice text="블라인드 공고는 매칭 담당 직원과 관리자만 관리합니다." />;
  }
  const sp = await searchParams;
  const leadId = Array.isArray(sp.leadId) ? sp.leadId[0] : sp.leadId;
  const prefill = leadId ? await postingPrefill(leadId) : null;

  const back = (
    <Link
      href="/admin/postings"
      className="inline-flex min-h-11 min-w-11 items-center text-dense text-n700 hover:text-navy"
    >
      ← 블라인드 공고
    </Link>
  );
  if (!prefill) {
    return (
      <div className="grid gap-4">
        {back}
        <ForbiddenNotice text="리드를 찾을 수 없습니다. 목록에서 리드 등급 A 리드를 고르세요." />
      </div>
    );
  }
  if (prefill.lead.grade !== "A") {
    return (
      <div className="grid gap-4">
        {back}
        <ForbiddenNotice
          text={`리드 등급 ${LEAD_GRADE_LABEL[prefill.lead.grade]} 리드로는 블라인드 공고를 만들 수 없습니다. 리드 등급 A(구인신청 + 직원 검증 완료)만 가능합니다.`}
        />
      </div>
    );
  }

  const [sidos, sigungus, industries, visas] = await Promise.all([
    db.region.findMany({
      where: { level: "SIDO" },
      orderBy: { sortOrder: "asc" },
      select: { code: true, nameKo: true },
    }),
    db.region.findMany({
      where: { level: "SIGUNGU" },
      orderBy: [{ sortOrder: "asc" }, { nameKo: "asc" }],
      select: { code: true, nameKo: true, parentCode: true },
    }),
    db.industry.findMany({ orderBy: { sortOrder: "asc" }, select: { code: true, nameKo: true } }),
    db.visaType.findMany({
      where: { active: true, isStatusCode: true },
      orderBy: { sortOrder: "asc" },
      select: { code: true },
    }),
  ]);

  return (
    <div className="grid gap-6" data-testid="posting-new">
      <div className="grid gap-2">
        {back}
        <h1 className="text-h2 text-navy">블라인드 공고 만들기</h1>
      </div>
      <section
        className="grid gap-2 rounded-md border border-n200 bg-n50 p-6"
        aria-labelledby="source-lead"
      >
        <h2 id="source-lead" className="text-ui font-semibold text-navy">
          원본 리드 (직원 참고용 · 공개되지 않음)
        </h2>
        <p className="text-dense text-n700">
          {prefill.lead.title ?? LEAD_NO_TITLE} · {prefill.lead.companyName ?? LEAD_NO_COMPANY}
        </p>
        <p className="text-caption text-n500">
          리드 제목과 회사 이름을 공고 제목·직무에 그대로 쓰지 않습니다. 회사 이름이나 연락처가
          들어가면 저장되지 않습니다.
        </p>
      </section>
      <section className="rounded-md border border-border bg-white p-6 shadow-1">
        <PostingCreateForm
          leadId={prefill.lead.id}
          defaults={{ ...prefill.values }}
          sidos={sidos.map((r) => ({ code: r.code, name: r.nameKo }))}
          sigungus={sigungus.map((r) => ({
            code: r.code,
            name: r.nameKo,
            parentCode: r.parentCode ?? "",
          }))}
          industries={industries.map((r) => ({ code: r.code, name: r.nameKo }))}
          visas={visas.map((v) => v.code)}
        />
      </section>
    </div>
  );
}
