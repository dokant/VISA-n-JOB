"use client";

import { unstable_rethrow } from "next/navigation";
import { type FormEvent, useActionState, useRef, useState, useTransition } from "react";

import { CALL_FINAL_CONFIRM, CALL_OUTCOME_LABEL } from "@/app/admin/_i18n/ko";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  CALL_NOTE_MAX,
  CALL_OUTCOMES,
  isCallOutcome,
  isFinalCallOutcome,
} from "@/schemas/admin/leads";
import { recordCallAction, verifyLeadAction } from "@/server/actions/admin/leads";
import type { AdminActionState } from "@/server/actions/admin/seekers";

import { ActionFeedback } from "./action-feedback";

/**
 * 통화 기록 (R-121). 결과에 따라 서버가 리드 등급을 옮기고 AuditLog를 남긴다.
 * 재접촉금지로 가는 결과(고용 의사 없음·재접촉 거부)는 되돌릴 수 없어 확인 다이얼로그를 거친다(Q-14).
 */
export function LeadCallForm({ leadId }: { leadId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [askOpen, setAskOpen] = useState(false);
  const [dialogError, setDialogError] = useState<AdminActionState>(null);
  const [, startTransition] = useTransition();
  // The form is submitted by hand (not `<form action>`) so a failed save keeps what was typed and the
  // chosen outcome (no automatic form reset); a success clears the form. A final outcome is saved
  // with the confirmation dialog open: a failure is shown inside the dialog and only a success
  // closes it (P2d 선행 A-4).
  const [state, action, pending] = useActionState<AdminActionState, FormData>(async (prev, fd) => {
    const fromDialog = fd.get("confirmFinal") === "yes";
    let r: AdminActionState;
    try {
      r = await recordCallAction(prev, fd);
    } catch (e) {
      unstable_rethrow(e); // redirects (expired staff session) still go through
      r = { ok: false, code: "ACTION_FAILED" };
    }
    if (r?.ok) {
      setAskOpen(false);
      formRef.current?.reset();
    } else if (fromDialog) {
      setDialogError(r);
    }
    return r;
  }, null);

  function submit(fd: FormData) {
    startTransition(() => action(fd));
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const outcome = fd.get("outcome");
    if (isCallOutcome(outcome) && isFinalCallOutcome(outcome)) {
      setDialogError(null);
      setAskOpen(true);
      return;
    }
    submit(fd);
  }

  function confirmAndSubmit() {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    fd.set("confirmFinal", "yes");
    submit(fd);
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-4" data-testid="call-form">
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
      {askOpen ? null : <ActionFeedback state={state} okText="통화 기록을 저장했습니다." />}
      <Dialog open={askOpen} onOpenChange={setAskOpen}>
        <DialogContent closeLabel={CALL_FINAL_CONFIRM.cancel} data-testid="call-final-confirm">
          <DialogTitle>{CALL_FINAL_CONFIRM.title}</DialogTitle>
          <DialogDescription>{CALL_FINAL_CONFIRM.body}</DialogDescription>
          <div className="flex flex-wrap justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline" data-testid="call-final-cancel">
                {CALL_FINAL_CONFIRM.cancel}
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={confirmAndSubmit}
              data-testid="call-final-confirm-submit"
            >
              {CALL_FINAL_CONFIRM.confirm}
            </Button>
          </div>
          <ActionFeedback state={dialogError} />
        </DialogContent>
      </Dialog>
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
