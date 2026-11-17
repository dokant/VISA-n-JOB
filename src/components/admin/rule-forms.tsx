"use client";

import { unstable_rethrow } from "next/navigation";
import { type FormEvent, useActionState, useRef, useState, useTransition } from "react";

import { OUTCOME_LABEL } from "@/app/admin/_i18n/ko";
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
import { RULE_JSON_MAX_CHARS } from "@/config/limits";
import { OUTCOMES } from "@/schemas/admin/rules";
import {
  createScoreTableAction,
  createVisaRuleAction,
  newScoreTableVersionAction,
  newVisaRuleVersionAction,
  publishScoreTableAction,
  publishVisaRuleAction,
  retireScoreTableAction,
  retireVisaRuleAction,
  updateScoreTableAction,
  updateVisaRuleAction,
} from "@/server/actions/admin/rules";
import type { AdminActionState } from "@/server/actions/admin/seekers";

import { ActionFeedback } from "./action-feedback";

type Action = (prev: AdminActionState, fd: FormData) => Promise<AdminActionState>;
type Option = { value: string; label: string };

/**
 * Runs a server action from a form submitted by hand (no automatic form reset): a refused save keeps
 * what was typed (P2d 선행 A-6 pattern). Redirects (new draft → its page, expired session) still go
 * through; any other throw becomes ACTION_FAILED instead of the error screen.
 */
function useManualAction(action: Action, onOk?: () => void) {
  const [, startTransition] = useTransition();
  const [state, run, pending] = useActionState<AdminActionState, FormData>(async (prev, fd) => {
    let r: AdminActionState;
    try {
      r = await action(prev, fd);
    } catch (e) {
      unstable_rethrow(e);
      r = { ok: false, code: "ACTION_FAILED" };
    }
    if (r?.ok) onOk?.();
    return r;
  }, null);
  const submit = (fd: FormData) => startTransition(() => run(fd));
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit(new FormData(e.currentTarget));
  };
  return { state, pending, submit, onSubmit };
}

export type VisaRuleFormValues = {
  visaCode: string;
  industryCode: string;
  outcome: string;
  messageKey: string;
  conditions: string;
};

/**
 * 규칙 초안 만들기 / 고치기 (R-215). Values are typed by the 행정사; the JSON shape is checked on the
 * server (src/schemas/visa/ruleConditions.ts). Saving never publishes.
 */
export function VisaRuleForm({
  id,
  values,
  visas,
  industries,
  messages,
}: {
  /** Present when editing a DRAFT version. */
  id?: string;
  values: VisaRuleFormValues;
  visas: Option[];
  industries: Option[];
  messages: Option[];
}) {
  const { state, pending, onSubmit } = useManualAction(
    id ? updateVisaRuleAction : createVisaRuleAction,
  );
  const p = id ? `rule-${id}` : "rule-new";
  return (
    <form onSubmit={onSubmit} className="grid gap-5.5" data-testid="visa-rule-form">
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <div className="grid gap-5.5 md:grid-cols-2">
        <div className="grid gap-1.75">
          <Label htmlFor={`${p}-visa`}>비자</Label>
          <NativeSelect id={`${p}-visa`} name="visaCode" required defaultValue={values.visaCode}>
            <option value="" disabled>
              선택하세요
            </option>
            {visas.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1.75">
          <Label htmlFor={`${p}-industry`}>업종 (선택, 비우면 모든 업종)</Label>
          <NativeSelect id={`${p}-industry`} name="industryCode" defaultValue={values.industryCode}>
            <option value="">모든 업종</option>
            {industries.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1.75">
          <Label htmlFor={`${p}-outcome`}>판정</Label>
          <NativeSelect id={`${p}-outcome`} name="outcome" required defaultValue={values.outcome}>
            {OUTCOMES.map((o) => (
              <option key={o} value={o}>
                {OUTCOME_LABEL[o]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1.75">
          <Label htmlFor={`${p}-message`}>안내 문구 (6개 언어 번역이 있는 문구만)</Label>
          <NativeSelect
            id={`${p}-message`}
            name="messageKey"
            required
            defaultValue={values.messageKey}
          >
            {messages.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <div className="grid gap-1.75">
        <Label htmlFor={`${p}-conditions`}>조건 (JSON, 행정사 입력)</Label>
        <Textarea
          id={`${p}-conditions`}
          name="conditions"
          required
          rows={10}
          maxLength={RULE_JSON_MAX_CHARS}
          defaultValue={values.conditions}
          className="font-mono"
          aria-describedby={`${p}-conditions-help`}
        />
        <p id={`${p}-conditions-help`} className="text-caption text-n500">
          형식: {"{"} &quot;all&quot;: [ {"{"} &quot;field&quot;: &quot;industryCode&quot;,
          &quot;op&quot;: &quot;eq&quot;, &quot;value&quot;: &quot;C&quot; {"}"} ] {"}"} · op는 eq,
          neq, in, notIn, exists, notExists, gt, gte, lt, lte · 빈 객체 {"{}"}는 이 비자(업종)의
          모든 입력에 해당합니다. &quot;__sample&quot; 표시가 남아 있으면 게시할 수 없습니다.
        </p>
      </div>
      <div>
        <Button type="submit" size="sm" disabled={pending} data-testid="visa-rule-save">
          {id ? "초안 저장" : "초안 만들기"}
        </Button>
      </div>
      <ActionFeedback
        state={state}
        okText="초안을 저장했습니다. 게시 전에는 공개 진단에 쓰이지 않습니다."
      />
    </form>
  );
}

export type ScoreTableFormValues = { name: string; passScore: string; items: string };

/** 점수표 초안 만들기 / 고치기 (R-215). 항목·구간·배점과 합격 점수는 행정사가 입력한다. */
export function ScoreTableForm({ id, values }: { id?: string; values: ScoreTableFormValues }) {
  const { state, pending, onSubmit } = useManualAction(
    id ? updateScoreTableAction : createScoreTableAction,
  );
  const p = id ? `table-${id}` : "table-new";
  return (
    <form onSubmit={onSubmit} className="grid gap-5.5" data-testid="score-table-form">
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <div className="grid gap-5.5 md:grid-cols-2">
        <div className="grid gap-1.75">
          <Label htmlFor={`${p}-name`}>점수표 이름</Label>
          <Input
            id={`${p}-name`}
            name="name"
            required
            maxLength={20}
            defaultValue={values.name}
            readOnly={Boolean(id)}
            aria-describedby={`${p}-name-help`}
          />
          <p id={`${p}-name-help`} className="text-caption text-n500">
            공개 점수 계산기는 이름이 E-7-4인 게시 점수표만 씁니다. 같은 이름의 버전은 하나만
            게시됩니다.
          </p>
        </div>
        <div className="grid gap-1.75">
          <Label htmlFor={`${p}-pass`}>합격 점수 (선택, 행정사 입력)</Label>
          <Input
            id={`${p}-pass`}
            name="passScore"
            inputMode="numeric"
            maxLength={7}
            defaultValue={values.passScore}
          />
        </div>
      </div>
      <div className="grid gap-1.75">
        <Label htmlFor={`${p}-items`}>항목·구간·배점 (JSON, 행정사 입력)</Label>
        <Textarea
          id={`${p}-items`}
          name="items"
          required
          rows={14}
          maxLength={RULE_JSON_MAX_CHARS}
          defaultValue={values.items}
          className="font-mono"
          aria-describedby={`${p}-items-help`}
        />
        <p id={`${p}-items-help`} className="text-caption text-n500">
          형식: {"{"} &quot;items&quot;: [ {"{"} &quot;key&quot;, &quot;label&quot;,
          &quot;bands&quot;: [ {"{"} &quot;key&quot;, &quot;label&quot;, &quot;points&quot; {"}"} ]{" "}
          {"}"} ] {"}"} · label은 문자열 또는 언어별 객체({"{"} &quot;ko&quot;: …, &quot;en&quot;: …{" "}
          {"}"}). &quot;__sample&quot; 표시가 남아 있으면 게시할 수 없습니다.
        </p>
      </div>
      <div>
        <Button type="submit" size="sm" disabled={pending} data-testid="score-table-save">
          {id ? "초안 저장" : "초안 만들기"}
        </Button>
      </div>
      <ActionFeedback
        state={state}
        okText="초안을 저장했습니다. 게시 전에는 점수 계산에 쓰이지 않습니다."
      />
    </form>
  );
}

type Kind = "rule" | "table";

const PUBLISH_ACTION: Record<Kind, Action> = {
  rule: publishVisaRuleAction,
  table: publishScoreTableAction,
};
const RETIRE_ACTION: Record<Kind, Action> = {
  rule: retireVisaRuleAction,
  table: retireScoreTableAction,
};
const NEW_VERSION_ACTION: Record<Kind, Action> = {
  rule: newVisaRuleVersionAction,
  table: newScoreTableVersionAction,
};

/**
 * 게시 / 폐기 with a confirmation dialog (STANDARD 3.1 dialog, destructive confirm). The dialog stays
 * open while the action runs; a failure is shown inside it and only a success closes it.
 */
function ConfirmAction({
  kind,
  id,
  mode,
  summary,
}: {
  kind: Kind;
  id: string;
  mode: "publish" | "retire";
  summary: string;
}) {
  const [open, setOpen] = useState(false);
  const { state, pending, submit } = useManualAction(
    (mode === "publish" ? PUBLISH_ACTION : RETIRE_ACTION)[kind],
    () => setOpen(false),
  );
  const formRef = useRef<HTMLFormElement>(null);
  const publish = mode === "publish";
  const what = kind === "rule" ? "규칙" : "점수표";
  return (
    <div className="grid gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant={publish ? "default" : "outline"}
            data-testid={`${kind}-${mode}`}
          >
            {publish ? "게시" : "폐기"}
          </Button>
        </DialogTrigger>
        <DialogContent closeLabel="닫기" data-testid={`${kind}-${mode}-dialog`}>
          <DialogTitle>
            {publish ? `이 ${what} 버전을 게시할까요?` : `이 ${what} 버전을 폐기할까요?`}
          </DialogTitle>
          <DialogDescription>
            {summary}{" "}
            {publish
              ? `게시하면 바로 공개 계산에 쓰이고, 같은 ${what}의 이전 게시 버전은 폐기됩니다. 검수자(나)와 게시 시각이 기록되고 감사 로그가 남습니다.`
              : "폐기하면 바로 공개 계산에서 빠집니다. 되돌릴 수 없고, 다시 쓰려면 새 버전을 만들어 게시해야 합니다. 감사 로그가 남습니다."}
          </DialogDescription>
          <form
            ref={formRef}
            onSubmit={(e) => {
              e.preventDefault();
              submit(new FormData(e.currentTarget));
            }}
            className="flex flex-wrap justify-end gap-2"
          >
            <input type="hidden" name="id" value={id} />
            <DialogClose asChild>
              <Button type="button" variant="outline">
                취소
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant="destructive"
              disabled={pending}
              data-testid={`${kind}-${mode}-confirm`}
            >
              {publish ? "게시하기" : "폐기하기"}
            </Button>
          </form>
          {state && !state.ok ? <ActionFeedback state={state} /> : null}
        </DialogContent>
      </Dialog>
      {state?.ok ? (
        <ActionFeedback state={state} okText={publish ? "게시했습니다." : "폐기했습니다."} />
      ) : null}
    </div>
  );
}

export function PublishButton(props: { kind: Kind; id: string; summary: string }) {
  return <ConfirmAction {...props} mode="publish" />;
}

export function RetireButton(props: { kind: Kind; id: string; summary: string }) {
  return <ConfirmAction {...props} mode="retire" />;
}

/** 새 버전 만들기: copies this version into a new DRAFT and opens it. */
export function NewVersionButton({ kind, id }: { kind: Kind; id: string }) {
  const { state, pending, onSubmit } = useManualAction(NEW_VERSION_ACTION[kind]);
  return (
    <form onSubmit={onSubmit} className="grid gap-2" data-testid={`${kind}-new-version-form`}>
      <input type="hidden" name="id" value={id} />
      <div>
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={pending}
          data-testid={`${kind}-new-version`}
        >
          새 버전 만들기
        </Button>
      </div>
      <ActionFeedback state={state} />
    </form>
  );
}
