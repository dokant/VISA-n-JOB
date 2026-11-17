"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  VISA_CASE_STATUS_LABEL,
  VISA_CASE_TYPE_LABEL,
  adminActionError,
} from "@/app/admin/_i18n/ko";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { VISA_CASE_STATUSES, VISA_CASE_TYPES } from "@/schemas/admin/visaCases";
import {
  type VisaCaseActionState,
  createVisaCaseAction,
  updateVisaCaseAction,
} from "@/server/actions/admin/visaCases";

export type VisaCaseValues = {
  caseType: string;
  targetVisa: string;
  status: string;
  companyId: string;
  mandateSignedAt: string;
  fee: number | "";
};

/**
 * 체류 사건 입력 칸 (R-216). BR-13: 외국인등록번호·여권번호 등 고유식별정보를 받는 칸은 없다(Phase 3,
 * 별도 동의). 자유 입력 칸도 두지 않는다.
 */
function Fields({
  prefix,
  values,
  visaOptions,
}: {
  prefix: string;
  values: VisaCaseValues;
  visaOptions: { code: string; label: string }[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="grid gap-1.5">
        <Label htmlFor={`${prefix}-type`}>사건 종류</Label>
        <NativeSelect id={`${prefix}-type`} name="caseType" defaultValue={values.caseType}>
          {VISA_CASE_TYPES.map((v) => (
            <option key={v} value={v}>
              {VISA_CASE_TYPE_LABEL[v]}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${prefix}-visa`}>목표 체류자격 (선택)</Label>
        <NativeSelect id={`${prefix}-visa`} name="targetVisa" defaultValue={values.targetVisa}>
          <option value="">정하지 않음</option>
          {visaOptions.map((v) => (
            <option key={v.code} value={v.code}>
              {v.label}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${prefix}-status`}>진행 상태</Label>
        <NativeSelect id={`${prefix}-status`} name="status" defaultValue={values.status}>
          {VISA_CASE_STATUSES.map((v) => (
            <option key={v} value={v}>
              {VISA_CASE_STATUS_LABEL[v]}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${prefix}-company`}>관련 기업 ID (선택)</Label>
        <Input id={`${prefix}-company`} name="companyId" defaultValue={values.companyId} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${prefix}-mandate`}>위임 계약일 (선택)</Label>
        <Input
          id={`${prefix}-mandate`}
          type="date"
          name="mandateSignedAt"
          defaultValue={values.mandateSignedAt}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${prefix}-fee`}>수임료(원, 선택)</Label>
        <Input
          id={`${prefix}-fee`}
          type="number"
          inputMode="numeric"
          min={0}
          name="fee"
          defaultValue={values.fee}
        />
      </div>
    </div>
  );
}

function Feedback({ state }: { state: VisaCaseActionState }) {
  if (!state) return null;
  if (state.ok) {
    return (
      <p
        role="status"
        className="text-caption text-success-subtle-foreground"
        data-testid="action-ok"
      >
        저장했습니다.{" "}
        <Link
          href={`/admin/visa-cases/${state.id}`}
          className="inline-flex min-h-11 min-w-11 items-center font-semibold text-brand-blue-700 hover:underline"
        >
          사건 상세
        </Link>
      </p>
    );
  }
  return (
    <p
      role="alert"
      className="text-caption text-error-text"
      data-testid="action-error"
      data-code={state.code}
    >
      {adminActionError(state.code)}
    </p>
  );
}

export function VisaCaseCreateForm({
  seekerId,
  visaOptions,
}: {
  seekerId: string;
  visaOptions: { code: string; label: string }[];
}) {
  const [state, action, pending] = useActionState<VisaCaseActionState, FormData>(
    createVisaCaseAction,
    null,
  );
  return (
    <form action={action} className="grid gap-4" data-testid="visa-case-create-form">
      <div className="grid gap-1.5">
        <Label htmlFor="visa-case-seeker">구직자 ID</Label>
        <Input id="visa-case-seeker" name="seekerId" required defaultValue={seekerId} />
      </div>
      <Fields
        prefix="visa-case-new"
        visaOptions={visaOptions}
        values={{
          caseType: "CHANGE",
          targetVisa: "",
          status: "OPEN",
          companyId: "",
          mandateSignedAt: "",
          fee: "",
        }}
      />
      <div>
        <Button type="submit" size="sm" disabled={pending} data-testid="visa-case-create">
          체류 사건 등록
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function VisaCaseEditForm({
  visaCaseId,
  values,
  visaOptions,
}: {
  visaCaseId: string;
  values: VisaCaseValues;
  visaOptions: { code: string; label: string }[];
}) {
  const [state, action, pending] = useActionState<VisaCaseActionState, FormData>(
    updateVisaCaseAction,
    null,
  );
  return (
    <form action={action} className="grid gap-4" data-testid="visa-case-edit-form">
      <input type="hidden" name="visaCaseId" value={visaCaseId} />
      <Fields prefix={`visa-case-${visaCaseId}`} visaOptions={visaOptions} values={values} />
      <div>
        <Button type="submit" size="sm" disabled={pending} data-testid="visa-case-save">
          저장
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
