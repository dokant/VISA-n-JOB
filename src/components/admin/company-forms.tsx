"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  setCompanyContractAction,
  setCompanyVerifiedAction,
} from "@/server/actions/admin/companies";
import type { AdminActionState } from "@/server/actions/admin/seekers";

import { ActionFeedback } from "./action-feedback";

/** 기업 검증 / 검증 해제 (R-218). 바꿀 때마다 감사 로그(COMPANY_VERIFY)가 남는다. */
export function CompanyVerifyForm({
  companyId,
  verified,
}: {
  companyId: string;
  verified: boolean;
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    setCompanyVerifiedAction,
    null,
  );
  return (
    <form action={action} className="grid gap-2" data-testid="company-verify-form">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="verified" value={verified ? "false" : "true"} />
      <Button
        type="submit"
        size="sm"
        variant={verified ? "outline" : "default"}
        disabled={pending}
        data-testid={verified ? "company-unverify" : "company-verify"}
      >
        {verified ? "검증 해제" : "검증 완료로 표시"}
      </Button>
      <ActionFeedback state={state} />
    </form>
  );
}

/** 계약 등록(계약일) / 계약 해제 (R-218). 기업이 화면에서 동의한 계약도 여기서 해제할 수 있다. */
export function CompanyContractForm({
  companyId,
  signedOn,
  today,
}: {
  companyId: string;
  /** "YYYY-MM-DD" (KST) of the current contract, or "" when none. */
  signedOn: string;
  /** "YYYY-MM-DD" (KST), default value of the date input. */
  today: string;
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    setCompanyContractAction,
    null,
  );
  const inputId = `contract-${companyId}`;
  return (
    <div className="grid gap-2">
      {signedOn ? (
        <form action={action} data-testid="company-contract-clear-form">
          <input type="hidden" name="companyId" value={companyId} />
          <input type="hidden" name="signedOn" value="" />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={pending}
            data-testid="company-contract-clear"
          >
            계약 해제
          </Button>
        </form>
      ) : (
        <form action={action} className="grid gap-2" data-testid="company-contract-form">
          <input type="hidden" name="companyId" value={companyId} />
          <Label htmlFor={inputId}>계약일</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id={inputId}
              type="date"
              name="signedOn"
              required
              defaultValue={today}
              className="w-auto"
            />
            <Button type="submit" size="sm" disabled={pending} data-testid="company-contract-set">
              계약 등록
            </Button>
          </div>
        </form>
      )}
      <ActionFeedback state={state} />
    </div>
  );
}
