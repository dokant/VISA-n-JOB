"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, startTransition, useActionState, useEffect, useState } from "react";

import { POSTING_CODE_LABEL, POSTING_FIELD_LABEL, adminActionError } from "@/app/admin/_i18n/ko";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { POSTING_HEADCOUNT_MAX, POSTING_ROLE_MAX, POSTING_TITLE_MAX } from "@/config/limits";
import {
  POSTING_DORMITORY,
  POSTING_MEALS,
  POSTING_OVERTIME,
  POSTING_SHIFT,
} from "@/schemas/admin/postings";
import {
  type CreatePostingState,
  closePostingAction,
  createPostingAction,
  publishPostingAction,
  verifyPostingAction,
} from "@/server/actions/admin/postings";
import type { AdminActionState } from "@/server/actions/admin/seekers";

import { ActionFeedback } from "./action-feedback";

type Option = { code: string; name: string };
type SigunguOption = Option & { parentCode: string };

export type PostingFormDefaults = {
  sido: string;
  sigungu: string | null;
  industryCode: string | null;
  payMin: number | null;
  payMax: number | null;
  headcount: number | null;
};

const REQUIRED = <span className="ms-1 font-normal text-n500">(필수)</span>;

function Field({
  id,
  label,
  required,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.75">
      <Label htmlFor={id}>
        {label}
        {required ? REQUIRED : null}
      </Label>
      {children}
      {hint ? <p className="text-caption text-n500">{hint}</p> : null}
    </div>
  );
}

/**
 * 블라인드 공고 작성 (R-201). 리드 등급 A에서만 서버가 받는다. 공개 문구(제목·직무)는 직원이 새로 쓴다 —
 * 리드 제목·회사명을 옮기지 않는다(BR-03). 연락처·회사명이 들어가면 서버가 거부한다.
 */
export function PostingCreateForm({
  leadId,
  defaults,
  sidos,
  sigungus,
  industries,
  visas,
}: {
  leadId: string;
  defaults: PostingFormDefaults;
  sidos: Option[];
  sigungus: SigunguOption[];
  industries: Option[];
  visas: string[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<CreatePostingState, FormData>(
    createPostingAction,
    null,
  );
  const [sido, setSido] = useState(defaults.sido);
  const sigunguOptions = sigungus.filter((s) => s.parentCode === sido);

  useEffect(() => {
    if (state?.ok) router.push(`/admin/postings/${state.postingId}`);
  }, [state, router]);

  // Submitted by hand (not `<form action>`), so a refused save keeps what the staff member typed
  // (React resets an action form after every submission).
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => action(data));
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5" data-testid="posting-create-form">
      <input type="hidden" name="leadId" value={leadId} />
      <Field
        id="posting-title"
        label="블라인드 제목"
        required
        hint="회사 이름·주소·연락처를 넣지 않습니다. 예: 충남 제조업 생산직(숙소 제공)"
      >
        <Input id="posting-title" name="blindTitle" required maxLength={POSTING_TITLE_MAX} />
      </Field>
      <Field id="posting-role" label="직무" required>
        <Input id="posting-role" name="role" required maxLength={POSTING_ROLE_MAX} />
      </Field>
      <div className="grid gap-5 md:grid-cols-2">
        <Field id="posting-sido" label="시·도" required>
          <NativeSelect
            id="posting-sido"
            name="sido"
            required
            value={sido}
            onChange={(e) => setSido(e.target.value)}
          >
            {sidos.map((o) => (
              <option key={o.code} value={o.code}>
                {o.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="posting-sigungu" label="시·군·구">
          <NativeSelect
            id="posting-sigungu"
            name="sigungu"
            key={sido}
            defaultValue={sido === defaults.sido ? (defaults.sigungu ?? "") : ""}
          >
            <option value="">선택 안 함</option>
            {sigunguOptions.map((o) => (
              <option key={o.code} value={o.code}>
                {o.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field id="posting-industry" label="업종" required>
        <NativeSelect
          id="posting-industry"
          name="industryCode"
          required
          defaultValue={defaults.industryCode ?? ""}
        >
          <option value="" disabled>
            선택하세요
          </option>
          {industries.map((o) => (
            <option key={o.code} value={o.code}>
              {o.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <div className="grid gap-5 md:grid-cols-3">
        <Field id="posting-pay-min" label="월 급여 최저(원, 세전)" required>
          <Input
            id="posting-pay-min"
            name="payMin"
            type="number"
            inputMode="numeric"
            min={1}
            required
            defaultValue={defaults.payMin ?? ""}
          />
        </Field>
        <Field id="posting-pay-max" label="월 급여 최고(원, 세전)">
          <Input
            id="posting-pay-max"
            name="payMax"
            type="number"
            inputMode="numeric"
            min={1}
            defaultValue={defaults.payMax ?? ""}
          />
        </Field>
        <Field id="posting-headcount" label="채용 인원" required>
          <Input
            id="posting-headcount"
            name="headcount"
            type="number"
            inputMode="numeric"
            min={1}
            max={POSTING_HEADCOUNT_MAX}
            required
            defaultValue={defaults.headcount ?? ""}
          />
        </Field>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Field id="posting-dormitory" label="숙소" required>
          <NativeSelect id="posting-dormitory" name="dormitory" required defaultValue="">
            <option value="" disabled>
              선택하세요
            </option>
            {POSTING_DORMITORY.map((c) => (
              <option key={c} value={c}>
                {POSTING_CODE_LABEL.dormitory[c]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="posting-meals" label="식사">
          <NativeSelect id="posting-meals" name="meals" defaultValue="">
            <option value="">안내 예정</option>
            {POSTING_MEALS.map((c) => (
              <option key={c} value={c}>
                {POSTING_CODE_LABEL.meals[c]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="posting-overtime" label="잔업">
          <NativeSelect id="posting-overtime" name="overtimeNote" defaultValue="">
            <option value="">안내 예정</option>
            {POSTING_OVERTIME.map((c) => (
              <option key={c} value={c}>
                {POSTING_CODE_LABEL.overtimeNote[c]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="posting-shift" label="교대">
          <NativeSelect id="posting-shift" name="shift" defaultValue="">
            <option value="">안내 예정</option>
            {POSTING_SHIFT.map((c) => (
              <option key={c} value={c}>
                {POSTING_CODE_LABEL.shift[c]}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-label font-semibold text-navy">
          채용 가능 비자{REQUIRED}
        </legend>
        <p className="text-caption text-n500">
          기업이 채용할 수 있다고 확인한 비자만 고릅니다. 이 목록에 없는 비자의 구직자에게는 면접
          신청 대신 상담 신청이 보입니다.
        </p>
        <div className="flex flex-wrap gap-x-5" data-testid="posting-visas-input">
          {visas.map((code) => (
            <label
              key={code}
              className="flex min-h-11 min-w-11 cursor-pointer items-center gap-2 text-dense text-navy"
            >
              <Checkbox name="eligibleVisas" value={code} data-testid={`visa-${code}`} />
              {code}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <Button type="submit" size="sm" disabled={pending} data-testid="posting-create-submit">
          블라인드 공고 저장(작성됨)
        </Button>
      </div>
      {state && !state.ok ? (
        <div
          role="alert"
          className="text-caption text-error-text"
          data-testid="action-error"
          data-code={state.code}
        >
          <p>{adminActionError(state.code)}</p>
          {state.field && POSTING_FIELD_LABEL[state.field] ? (
            <p>확인할 항목: {POSTING_FIELD_LABEL[state.field]}</p>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

function StepForm({
  postingId,
  action: serverAction,
  label,
  okText,
  testId,
  variant = "default",
}: {
  postingId: string;
  action: (prev: AdminActionState, fd: FormData) => Promise<AdminActionState>;
  label: string;
  okText: string;
  testId: string;
  variant?: "default" | "outline";
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(serverAction, null);
  return (
    <form action={action} className="grid gap-2" data-testid={`${testId}-form`}>
      <input type="hidden" name="postingId" value={postingId} />
      <div>
        <Button type="submit" size="sm" variant={variant} disabled={pending} data-testid={testId}>
          {label}
        </Button>
      </div>
      <ActionFeedback state={state} okText={okText} />
    </form>
  );
}

/** 검증 완료 기록 (BR-05: verifiedBy·verifiedAt). */
export function VerifyPostingForm({ postingId }: { postingId: string }) {
  return (
    <StepForm
      postingId={postingId}
      action={verifyPostingAction}
      label="검증 완료로 기록"
      okText="검증 완료를 기록했습니다."
      testId="posting-verify"
    />
  );
}

/** 공개 (WO §15-4: 검증 전이면 서버가 거부, 공개 시 AuditLog POSTING_PUBLISH). */
export function PublishPostingForm({ postingId }: { postingId: string }) {
  return (
    <StepForm
      postingId={postingId}
      action={publishPostingAction}
      label="공개하기"
      okText="공개했습니다."
      testId="posting-publish"
    />
  );
}

export function ClosePostingForm({ postingId }: { postingId: string }) {
  return (
    <StepForm
      postingId={postingId}
      action={closePostingAction}
      label="마감하기"
      okText="마감했습니다."
      testId="posting-close"
      variant="outline"
    />
  );
}
