import { REQUIREMENT_LABEL, adminActionError } from "@/app/admin/_i18n/ko";
import type { GradeRequirement } from "@/lib/admin/seekerReview";

type State =
  { ok: true; at?: number } | { ok: false; code: string; missing?: GradeRequirement[] } | null;

/** 서버 액션 결과 한 줄 (오류는 role="alert", 저장은 role="status"). */
export function ActionFeedback({
  state,
  okText = "저장했습니다.",
}: {
  state: State;
  okText?: string;
}) {
  if (!state) return null;
  if (state.ok) {
    return (
      <p
        role="status"
        className="text-caption text-success-subtle-foreground"
        data-testid="action-ok"
      >
        {okText}
      </p>
    );
  }
  return (
    <div
      role="alert"
      className="text-caption text-error-text"
      data-testid="action-error"
      data-code={state.code}
    >
      <p>{adminActionError(state.code)}</p>
      {state.missing && state.missing.length > 0 ? (
        <p>부족한 조건: {state.missing.map((m) => REQUIREMENT_LABEL[m]).join(", ")}</p>
      ) : null}
    </div>
  );
}
