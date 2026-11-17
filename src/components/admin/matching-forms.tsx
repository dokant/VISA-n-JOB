"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import { adminActionError } from "@/app/admin/_i18n/ko";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  INTERVIEW_INTERPRETER_MAX,
  INTERVIEW_PLACE_MAX,
  INTRO_CONFIRM_TYPES,
  RECOMMENDATION_NOTE_MAX,
} from "@/config/limits";
import {
  type FileUrlState,
  type RecommendActionState,
  cancelInterviewAction,
  confirmInterviewAction,
  createInterviewAction,
  introConfirmUrlAction,
  recommendForInterestAction,
  recommendForPostingAction,
  recordInterviewResultAction,
  uploadIntroConfirmAction,
} from "@/server/actions/admin/matching";
import type { AdminActionState } from "@/server/actions/admin/seekers";

import { ActionFeedback } from "./action-feedback";

/**
 * 추천 실행 (R-209): confirmation dialog (STANDARD 3.1 dialog "추천 실행 등"), optional staff note
 * (no contacts — checked on the server). The ledger row cannot be changed afterwards (BR-09).
 */
export function RecommendButton({
  target,
  summary,
}: {
  target: { postingId: string; seekerId: string } | { interestRequestId: string };
  summary: string;
}) {
  const forInterest = "interestRequestId" in target;
  const [state, action, pending] = useActionState<RecommendActionState, FormData>(
    forInterest ? recommendForInterestAction : recommendForPostingAction,
    null,
  );
  if (state?.ok) {
    return (
      <div className="grid gap-1" role="status" data-testid="recommend-done">
        <p className="text-caption text-success-subtle-foreground">
          {state.already ? "이미 추천한 건입니다." : "추천을 원장에 기록했습니다."}
        </p>
        <Link
          href={`/admin/matching/recommendations/${state.recommendationId}`}
          className="inline-flex min-h-11 min-w-11 items-center text-dense font-semibold text-brand-blue-700 underline"
        >
          면접 일정 잡기
        </Link>
      </div>
    );
  }
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="recommend-open">
          추천 실행
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel="닫기">
        <DialogTitle>추천을 실행할까요?</DialogTitle>
        <DialogDescription>
          {summary} 추천 원장은 기록 후 고치거나 지울 수 없습니다. 기업 화면에는 블라인드 정보만
          보입니다.
        </DialogDescription>
        <form action={action} className="grid gap-4" data-testid="recommend-form">
          {forInterest ? (
            <input type="hidden" name="interestRequestId" value={target.interestRequestId} />
          ) : (
            <>
              <input type="hidden" name="postingId" value={target.postingId} />
              <input type="hidden" name="seekerId" value={target.seekerId} />
            </>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="recommend-note">직원 메모 (선택, 연락처 금지)</Label>
            <Textarea id="recommend-note" name="note" maxLength={RECOMMENDATION_NOTE_MAX} />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                취소
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending} data-testid="recommend-confirm">
              추천 기록
            </Button>
          </div>
          {state && !state.ok ? (
            <p role="alert" className="text-caption text-error-text" data-code={state.code}>
              {adminActionError(state.code)}
            </p>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** 면접 일정 잡기 (KST date + time, place shown to the company — no contacts). */
export function InterviewCreateForm({ recommendationId }: { recommendationId: string }) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    createInterviewAction,
    null,
  );
  return (
    <form action={action} className="grid gap-4" data-testid="interview-create-form">
      <input type="hidden" name="recommendationId" value={recommendationId} />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="iv-at">일시 (한국 시간)</Label>
          <Input id="iv-at" type="datetime-local" name="scheduledAt" required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="iv-place">장소 (기업에 보임, 연락처 금지)</Label>
          <Input id="iv-place" name="place" required maxLength={INTERVIEW_PLACE_MAX} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="iv-interpreter">통역 (직원 전용, 선택)</Label>
          <Input id="iv-interpreter" name="interpreter" maxLength={INTERVIEW_INTERPRETER_MAX} />
        </div>
      </div>
      <div>
        <Button type="submit" size="sm" disabled={pending} data-testid="interview-create">
          면접 일정 저장
        </Button>
      </div>
      <ActionFeedback state={state} />
    </form>
  );
}

/** 면접 확정 (→ 구직자 건별 동의 요청) / 면접 취소. */
export function InterviewStatusForms({
  interviewId,
  recommendationId,
  status,
}: {
  interviewId: string;
  recommendationId: string;
  status: string;
}) {
  const [confirmState, confirm, confirming] = useActionState<AdminActionState, FormData>(
    confirmInterviewAction,
    null,
  );
  const [cancelState, cancel, cancelling] = useActionState<AdminActionState, FormData>(
    cancelInterviewAction,
    null,
  );
  if (status === "CANCELLED") return null;
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {status === "SCHEDULED" ? (
          <form action={confirm}>
            <input type="hidden" name="interviewId" value={interviewId} />
            <input type="hidden" name="recommendationId" value={recommendationId} />
            <Button type="submit" size="sm" disabled={confirming} data-testid="interview-confirm">
              면접 확정 (구직자 동의 요청)
            </Button>
          </form>
        ) : null}
        <form action={cancel}>
          <input type="hidden" name="interviewId" value={interviewId} />
          <input type="hidden" name="recommendationId" value={recommendationId} />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={cancelling}
            data-testid="interview-cancel"
          >
            면접 취소
          </Button>
        </form>
      </div>
      <ActionFeedback
        state={confirmState}
        okText="면접을 확정했습니다. 구직자에게 동의를 요청했습니다."
      />
      <ActionFeedback state={cancelState} okText="면접을 취소했습니다." />
    </div>
  );
}

export function InterviewResultForm({
  interviewId,
  recommendationId,
  attended,
  result,
}: {
  interviewId: string;
  recommendationId: string;
  attended: boolean | null;
  result: string | null;
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    recordInterviewResultAction,
    null,
  );
  return (
    <form action={action} className="grid gap-2" data-testid="interview-result-form">
      <input type="hidden" name="interviewId" value={interviewId} />
      <input type="hidden" name="recommendationId" value={recommendationId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`att-${interviewId}`}>참석</Label>
          <NativeSelect
            id={`att-${interviewId}`}
            name="attended"
            defaultValue={attended === null ? "" : attended ? "YES" : "NO"}
          >
            <option value="">미입력</option>
            <option value="YES">참석</option>
            <option value="NO">불참</option>
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`res-${interviewId}`}>결과</Label>
          <NativeSelect id={`res-${interviewId}`} name="result" defaultValue={result ?? ""}>
            <option value="">미입력</option>
            <option value="PENDING">결과 대기</option>
            <option value="HIRED">채용</option>
            <option value="REJECTED">불합격</option>
            <option value="NO_SHOW">노쇼</option>
          </NativeSelect>
        </div>
      </div>
      <div>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          결과 저장
        </Button>
      </div>
      <ActionFeedback state={state} />
    </form>
  );
}

/** 소개 확인서 업로드 (R-210): PDF / JPG / PNG, size checked on the server from the bytes. */
export function IntroConfirmUploadForm({
  interviewId,
  recommendationId,
}: {
  interviewId: string;
  recommendationId: string;
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    uploadIntroConfirmAction,
    null,
  );
  return (
    <form action={action} className="grid gap-2" data-testid="intro-upload-form">
      <input type="hidden" name="interviewId" value={interviewId} />
      <input type="hidden" name="recommendationId" value={recommendationId} />
      <Label htmlFor={`intro-${interviewId}`}>소개 확인서 (PDF·JPG·PNG)</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          id={`intro-${interviewId}`}
          type="file"
          name="file"
          required
          accept={INTRO_CONFIRM_TYPES.join(",")}
          className="w-auto"
        />
        <Button type="submit" size="sm" disabled={pending} data-testid="intro-upload">
          올리기
        </Button>
      </div>
      <ActionFeedback state={state} okText="소개 확인서를 저장했습니다." />
    </form>
  );
}

/** Opens the 소개 확인서 through a fresh 5-minute signed URL (issued at click time). */
export function IntroConfirmOpenButton({ interviewId }: { interviewId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const open = () =>
    startTransition(async () => {
      setError(null);
      const r = (await introConfirmUrlAction(interviewId)) as FileUrlState;
      if (r.ok) window.location.assign(r.url);
      else setError(r.code);
    });
  return (
    <div className="grid gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={open}
        data-testid="intro-open"
      >
        소개 확인서 열기
      </Button>
      {error ? (
        <p role="alert" className="text-caption text-error-text">
          {adminActionError(error)}
        </p>
      ) : null}
    </div>
  );
}
