"use client";

import type { SeekerGrade, SeekerTrack } from "@prisma/client";
import { useActionState } from "react";

import { SEEKER_GRADE_LABEL, TRACK_LABEL } from "@/app/admin/_i18n/ko";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  type AdminActionState,
  changeGradeAction,
  changeTrackAction,
  setConvertibilityAction,
  updateReviewFlagsAction,
} from "@/server/actions/admin/seekers";

import { ActionFeedback } from "./action-feedback";

/** 등급 변경 버튼 묶음 (R-120). 조건 검사는 서버가 한다 — 버튼 상태는 안내일 뿐이다. */
export function GradeChangeForm({
  seekerId,
  grade,
  promoteReady,
}: {
  seekerId: string;
  grade: SeekerGrade;
  /** Requirements of the next grade are all met (display hint only). */
  promoteReady: boolean;
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    changeGradeAction,
    null,
  );
  const up: SeekerGrade | null = grade === "B" ? "A" : grade === "A" ? "S" : null;
  const down: SeekerGrade | null = grade === "S" ? "A" : grade === "A" ? "B" : null;
  return (
    <form action={action} className="grid gap-3" data-testid="grade-form">
      <input type="hidden" name="seekerId" value={seekerId} />
      <div className="flex flex-wrap gap-2">
        {up ? (
          <Button
            type="submit"
            name="to"
            value={up}
            size="sm"
            variant={promoteReady ? "default" : "outline"}
            disabled={pending}
            data-testid={`promote-${up}`}
          >
            {SEEKER_GRADE_LABEL[up]}으로 승격
          </Button>
        ) : null}
        {down ? (
          <Button
            type="submit"
            name="to"
            value={down}
            size="sm"
            variant="outline"
            disabled={pending}
            data-testid={`demote-${down}`}
          >
            {SEEKER_GRADE_LABEL[down]}으로 내림
          </Button>
        ) : null}
      </div>
      <ActionFeedback state={state} okText="구직자 등급을 바꿨습니다." />
    </form>
  );
}

/** 확인 항목 (상담 완료 · 체류자격 확인 · 한국어 확인). */
export function ReviewFlagsForm({
  seekerId,
  consulted,
  verifiedVisa,
  verifiedKorean,
}: {
  seekerId: string;
  consulted: boolean;
  verifiedVisa: boolean;
  verifiedKorean: boolean;
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    updateReviewFlagsAction,
    null,
  );
  const rows = [
    { name: "consulted", label: "직원 상담 완료", checked: consulted },
    { name: "verifiedVisa", label: "체류자격 확인", checked: verifiedVisa },
    { name: "verifiedKorean", label: "한국어 확인", checked: verifiedKorean },
  ];
  return (
    <form action={action} className="grid gap-2" data-testid="flags-form">
      <input type="hidden" name="seekerId" value={seekerId} />
      {rows.map((r) => (
        <label
          key={`${r.name}-${String(r.checked)}`}
          className="flex min-h-11 cursor-pointer items-center gap-3 text-dense text-navy"
        >
          <Checkbox
            name={r.name}
            value="true"
            defaultChecked={r.checked}
            data-testid={`flag-${r.name}`}
          />
          {r.label}
        </label>
      ))}
      <div>
        <Button type="submit" size="sm" disabled={pending} data-testid="flags-save">
          확인 항목 저장
        </Button>
      </div>
      <ActionFeedback state={state} />
    </form>
  );
}

const TRACKS: SeekerTrack[] = ["JOB_MATCH", "FUTURE_POOL", "CONSULT_ONLY"];

export function TrackChangeForm({
  seekerId,
  track,
}: {
  seekerId: string;
  track: SeekerTrack | null;
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    changeTrackAction,
    null,
  );
  return (
    <form action={action} className="grid gap-3" data-testid="track-form">
      <input type="hidden" name="seekerId" value={seekerId} />
      <div className="grid gap-1.75">
        <Label htmlFor="track-to">트랙</Label>
        <NativeSelect id="track-to" name="to" defaultValue={track ?? "JOB_MATCH"}>
          {TRACKS.map((t) => (
            <option key={t} value={t}>
              {TRACK_LABEL[t]}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          트랙 변경
        </Button>
      </div>
      <ActionFeedback state={state} okText="트랙을 바꿨습니다." />
    </form>
  );
}

export function ConvertibilityForm({
  seekerId,
  options,
  convertibleVisa,
  convertibleAt,
}: {
  seekerId: string;
  options: string[];
  convertibleVisa: string | null;
  /** YYYY-MM-DD or "" */
  convertibleAt: string;
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    setConvertibilityAction,
    null,
  );
  return (
    <form action={action} className="grid gap-3" data-testid="convertible-form">
      <input type="hidden" name="seekerId" value={seekerId} />
      <div className="grid gap-1.75">
        <Label htmlFor="convertible-visa">전환 가능 비자 (행정사 판정)</Label>
        <NativeSelect
          id="convertible-visa"
          name="convertibleVisa"
          defaultValue={convertibleVisa ?? ""}
        >
          <option value="">판정 없음</option>
          {options.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1.75">
        <Label htmlFor="convertible-at">전환 가능 예상 시점</Label>
        <Input id="convertible-at" name="convertibleAt" type="date" defaultValue={convertibleAt} />
      </div>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          전환 가능성 저장
        </Button>
      </div>
      <ActionFeedback state={state} />
    </form>
  );
}
