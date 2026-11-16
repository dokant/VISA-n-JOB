"use client";

import { useActionState } from "react";

import { CALL_OUTCOME_LABEL } from "@/app/admin/_i18n/ko";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { CALL_NOTE_MAX, CALL_OUTCOMES } from "@/schemas/admin/leads";
import { recordCallAction, verifyLeadAction } from "@/server/actions/admin/leads";
import type { AdminActionState } from "@/server/actions/admin/seekers";

import { ActionFeedback } from "./action-feedback";

/** 통화 기록 (R-121). 결과에 따라 서버가 리드 등급을 옮기고 AuditLog를 남긴다. */
export function LeadCallForm({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    recordCallAction,
    null,
  );
  return (
    <form action={action} className="grid gap-4" data-testid="call-form">
      <input type="hidden" name="leadId" value={leadId} />
      <div className="grid gap-1.75">
        <Label htmlFor="call-outcome">
          통화 결과<span className="ms-1 font-normal text-n500">(필수)</span>
        </Label>
        <NativeSelect id="call-outcome" name="outcome" required defaultValue="">
          <option value="" disabled>
            선택하세요
          </option>
          {CALL_OUTCOMES.map((o) => (
            <option key={o} value={o}>
              {CALL_OUTCOME_LABEL[o]}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1.75">
        <Label htmlFor="call-next">다음 연락 예정일</Label>
        <Input id="call-next" name="nextActionAt" type="date" />
      </div>
      <div className="grid gap-1.75">
        <Label htmlFor="call-note">메모 (연락처는 적지 않습니다)</Label>
        <Textarea id="call-note" name="note" maxLength={CALL_NOTE_MAX} rows={3} />
      </div>
      <div>
        <Button type="submit" size="sm" disabled={pending} data-testid="call-save">
          통화 기록 저장
        </Button>
      </div>
      <ActionFeedback state={state} okText="통화 기록을 저장했습니다." />
    </form>
  );
}

/** 구인신청 + 직원 검증 → A (BR-05, WO §8.2). */
export function VerifyLeadForm({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    verifyLeadAction,
    null,
  );
  return (
    <form action={action} className="grid gap-3" data-testid="verify-form">
      <input type="hidden" name="leadId" value={leadId} />
      <div>
        <Button type="submit" size="sm" disabled={pending} data-testid="verify-lead">
          검증 완료 (A로)
        </Button>
      </div>
      <ActionFeedback state={state} okText="리드 등급을 A로 바꿨습니다." />
    </form>
  );
}
