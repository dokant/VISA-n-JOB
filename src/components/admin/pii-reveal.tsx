"use client";

import { Eye } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { type LeadContactState, revealLeadContactAction } from "@/server/actions/admin/leads";
import {
  type RevealState,
  revealSeekerBasicAction,
  revealSeekerContactAction,
} from "@/server/actions/admin/seekers";

import { ActionFeedback } from "./action-feedback";

/**
 * 개인정보 열람 (R-122). 값은 버튼을 누를 때만 서버에서 복호해 받아 오고, 받을 때마다 서버가
 * AuditLog(PII_VIEW)를 남긴다. 화면을 떠나면 값은 남지 않는다.
 */
function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5">
      <dt className="text-dense text-n700">{label}</dt>
      <dd className="col-span-2 text-dense text-navy">{value && value !== "" ? value : "—"}</dd>
    </div>
  );
}

export function SeekerPiiReveal({
  seekerId,
  group,
}: {
  seekerId: string;
  group: "basic" | "contact";
}) {
  const [state, action, pending] = useActionState<RevealState, FormData>(
    group === "basic" ? revealSeekerBasicAction : revealSeekerContactAction,
    null,
  );
  const label = group === "basic" ? "이름·학교·이전 직장 열람" : "연락처 열람";
  return (
    <div className="grid gap-3" data-testid={`pii-${group}`}>
      {state?.ok ? (
        <dl className="divide-y divide-n100" data-testid={`pii-${group}-values`}>
          {state.values.group === "basic" ? (
            <>
              <Row label="이름" value={state.values.legalName} />
              <Row label="학교" value={state.values.schoolName} />
              <Row label="이전 직장" value={state.values.employerNames.join(", ")} />
            </>
          ) : (
            <>
              <Row label="전화" value={state.values.phone} />
              <Row
                label="메신저"
                value={
                  state.values.messengerId
                    ? `${state.values.messengerType ?? ""} ${state.values.messengerId}`.trim()
                    : null
                }
              />
              <Row label="이메일" value={state.values.email} />
            </>
          )}
        </dl>
      ) : (
        <form action={action}>
          <input type="hidden" name="seekerId" value={seekerId} />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={pending}
            data-testid={`reveal-${group}`}
          >
            <Eye aria-hidden="true" strokeWidth={1.5} />
            {label}
          </Button>
        </form>
      )}
      {state && !state.ok ? <ActionFeedback state={state} /> : null}
      <p className="text-caption text-n500">열람할 때마다 개인정보 열람 기록이 남습니다.</p>
    </div>
  );
}

export function LeadContactReveal({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState<LeadContactState, FormData>(
    revealLeadContactAction,
    null,
  );
  return (
    <div className="grid gap-3" data-testid="lead-contact">
      {state?.ok ? (
        <dl className="divide-y divide-n100" data-testid="lead-contact-values">
          <Row label="담당자" value={state.values.name} />
          <Row label="전화" value={state.values.phone} />
          <Row label="이메일" value={state.values.email} />
        </dl>
      ) : (
        <form action={action}>
          <input type="hidden" name="leadId" value={leadId} />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={pending}
            data-testid="reveal-lead-contact"
          >
            <Eye aria-hidden="true" strokeWidth={1.5} />
            기업 담당자 연락처 열람
          </Button>
        </form>
      )}
      {state && !state.ok ? <ActionFeedback state={state} /> : null}
      <p className="text-caption text-n500">열람할 때마다 개인정보 열람 기록이 남습니다.</p>
    </div>
  );
}
