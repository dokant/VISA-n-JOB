import type { SeekerGrade } from "@prisma/client";
import { Check, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import {
  JOB_SEARCH_LABEL,
  REQUIREMENT_LABEL,
  SEEKER_GRADE_LABEL,
  SEEKER_STATUS_LABEL,
  TRACK_LABEL,
  fmtDate,
  fmtDateTime,
  fmtMonth,
  isoDay,
} from "@/app/admin/_i18n/ko";
import { SeekerPiiReveal } from "@/components/admin/pii-reveal";
import {
  ConvertibilityForm,
  GradeChangeForm,
  ReviewFlagsForm,
  TrackChangeForm,
} from "@/components/admin/seeker-review-forms";
import { requireStaff } from "@/lib/admin/session";
import {
  convertibleVisaOptions,
  getSeekerForReview,
  gradeRequirements,
} from "@/lib/admin/seekerReview";
import { db } from "@/lib/db";
import { ANY_REGION } from "@/lib/seeker/options";
import { assertCan, can } from "@/lib/rbac";

export const metadata: Metadata = { title: "구직자 상세" };
export const dynamic = "force-dynamic";

function Section({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
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
      <dd className="col-span-2 text-dense text-navy">{value}</dd>
    </div>
  );
}

/** /admin/seekers/[id] — 구직자 상세 + 검토(R-120). 복호 필드는 열람 버튼으로만(R-122). */
export default async function SeekerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireStaff(); // rbac: admin:access + 2FA
  assertCan(actor, "seeker:view");
  const { id } = await params;
  const seeker = await getSeekerForReview(id);
  if (!seeker) notFound();

  const now = new Date();
  const reviewer = can(actor.role, "seeker:review");
  const contactOk = can(actor.role, "contact:view");
  const next: SeekerGrade | null = seeker.grade === "B" ? "A" : seeker.grade === "A" ? "S" : null;
  const requirements = next ? gradeRequirements(seeker, next, now) : [];
  const [options, regions, industries] = await Promise.all([
    reviewer ? convertibleVisaOptions() : Promise.resolve([] as string[]),
    db.region.findMany({ where: { level: "SIDO" }, select: { code: true, nameKo: true } }),
    db.industry.findMany({ select: { code: true, nameKo: true } }),
  ]);
  const regionName = new Map(regions.map((r) => [r.code, r.nameKo]));
  const industryName = new Map(industries.map((r) => [r.code, r.nameKo]));
  const names = (codes: string[], map: Map<string, string>) =>
    codes.length === 0
      ? "—"
      : codes.map((c) => (c === ANY_REGION ? "어디든 가능" : (map.get(c) ?? c))).join(", ");

  return (
    <div className="grid gap-6" data-testid="seeker-detail">
      <div className="grid gap-2">
        <Link
          href="/admin/seekers"
          className="inline-flex min-h-11 items-center text-dense text-n700 hover:text-navy"
        >
          ← 구직자 검토
        </Link>
        <h1 className="text-h2 text-navy">구직자 #{seeker.publicId.slice(0, 8)}</h1>
        <p className="text-dense text-n700">
          구직자 등급{" "}
          <strong className="font-semibold text-navy" data-testid="seeker-grade">
            {SEEKER_GRADE_LABEL[seeker.grade]}
          </strong>{" "}
          · 트랙{" "}
          <strong className="font-semibold text-navy" data-testid="seeker-track">
            {seeker.track ? TRACK_LABEL[seeker.track] : "미정"}
          </strong>{" "}
          · {SEEKER_STATUS_LABEL[seeker.status]}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="등록 정보" id="info-title">
          <dl className="divide-y divide-n100">
            <Field label="국적" value={seeker.nationality ?? "—"} />
            <Field label="출생 연도" value={seeker.birthYear ?? "—"} />
            <Field
              label="거주 시·도"
              value={seeker.sido ? (regionName.get(seeker.sido) ?? seeker.sido) : "—"}
            />
            <Field
              label="비자"
              value={[seeker.visaCode, seeker.visaSubType].filter(Boolean).join(" / ") || "—"}
            />
            <Field label="체류 만료" value={fmtMonth(seeker.stayExpiry)} />
            <Field
              label="한국어"
              value={`TOPIK ${seeker.topikLevel ?? "—"} · 사회통합 ${seeker.kiipStage ?? "—"} · 말하기 자가평가 ${seeker.koreanSpeaking ?? "—"}`}
            />
            <Field label="희망 업종" value={names(seeker.desiredIndustries, industryName)} />
            <Field label="희망 지역" value={names(seeker.desiredRegions, regionName)} />
            <Field
              label="구직 상태"
              value={seeker.jobSearchStatus ? JOB_SEARCH_LABEL[seeker.jobSearchStatus] : "—"}
            />
            <Field label="다음 비자 목표" value={seeker.nextVisaGoal ?? "—"} />
            <Field label="상담 희망" value={seeker.wantsConsult ? "예" : "아니오"} />
            <Field label="비자 검토 필요" value={seeker.needsVisaReview ? "예" : "아니오"} />
            <Field
              label="등록"
              value={`${fmtDate(seeker.createdAt)} · ${seeker.isQuickSignup ? "간편 등록" : "정식 등록"} · ${seeker.completedStep}단계`}
            />
            <Field label="최근 상태 확인" value={fmtDateTime(seeker.lastActiveConfirmedAt)} />
          </dl>
        </Section>

        <Section title="개인정보 열람" id="pii-title">
          <SeekerPiiReveal seekerId={seeker.id} group="basic" />
          {contactOk ? (
            <SeekerPiiReveal seekerId={seeker.id} group="contact" />
          ) : (
            <p className="text-caption text-n500">
              연락처는 매칭 담당 직원과 관리자만 열람할 수 있습니다.
            </p>
          )}
        </Section>

        <Section title="구직자 등급" id="grade-title">
          {next ? (
            <div className="grid gap-2">
              <p className="text-dense text-n700">{SEEKER_GRADE_LABEL[next]} 승격 조건</p>
              <ul className="grid gap-1" data-testid="grade-requirements">
                {requirements.map((r) => (
                  <li key={r.key} className="flex items-center gap-2 text-dense" data-met={r.met}>
                    {r.met ? (
                      <Check aria-hidden="true" strokeWidth={2} className="size-4 text-success" />
                    ) : (
                      <X aria-hidden="true" strokeWidth={1.5} className="size-4 text-error-text" />
                    )}
                    <span className={r.met ? "text-navy" : "text-n700"}>
                      {REQUIREMENT_LABEL[r.key]}
                      <span className="sr-only">{r.met ? " (충족)" : " (미충족)"}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-dense text-n700">최고 등급입니다.</p>
          )}
          {reviewer ? (
            <GradeChangeForm
              seekerId={seeker.id}
              grade={seeker.grade}
              promoteReady={requirements.every((r) => r.met)}
            />
          ) : (
            <p className="text-caption text-n500">
              등급 변경은 비자 담당 직원과 관리자만 할 수 있습니다.
            </p>
          )}
        </Section>

        <Section title="확인 항목" id="flags-title">
          {reviewer ? (
            <ReviewFlagsForm
              seekerId={seeker.id}
              consulted={seeker.consultedAt != null}
              verifiedVisa={seeker.verifiedVisa}
              verifiedKorean={seeker.verifiedKorean}
            />
          ) : (
            <dl className="divide-y divide-n100">
              <Field
                label="직원 상담"
                value={seeker.consultedAt ? fmtDateTime(seeker.consultedAt) : "전"}
              />
              <Field label="체류자격 확인" value={seeker.verifiedVisa ? "완료" : "전"} />
              <Field label="한국어 확인" value={seeker.verifiedKorean ? "완료" : "전"} />
            </dl>
          )}
          {seeker.consultedAt ? (
            <p className="text-caption text-n500">상담 기록: {fmtDateTime(seeker.consultedAt)}</p>
          ) : null}
        </Section>

        <Section title="트랙" id="track-title">
          {reviewer ? (
            <TrackChangeForm seekerId={seeker.id} track={seeker.track} />
          ) : (
            <p className="text-dense text-navy">
              {seeker.track ? TRACK_LABEL[seeker.track] : "미정"}
            </p>
          )}
        </Section>

        <Section title="전환 가능성 판정" id="convert-title">
          {reviewer ? (
            <ConvertibilityForm
              seekerId={seeker.id}
              options={options}
              convertibleVisa={seeker.convertibleVisa}
              convertibleAt={isoDay(seeker.convertibleAt)}
            />
          ) : (
            <dl className="divide-y divide-n100">
              <Field label="전환 가능 비자" value={seeker.convertibleVisa ?? "—"} />
              <Field label="예상 시점" value={fmtDate(seeker.convertibleAt)} />
            </dl>
          )}
          <p className="text-caption text-n500">참고용 판정입니다. 행정사 확인이 필요합니다.</p>
        </Section>
      </div>
    </div>
  );
}
