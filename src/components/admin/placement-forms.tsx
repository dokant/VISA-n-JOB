"use client";

import { useActionState } from "react";

import { FEE_STATUS_LABEL } from "@/app/admin/_i18n/ko";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { FEE_STATUSES } from "@/schemas/admin/placements";
import { createPlacementAction, updatePlacementAction } from "@/server/actions/admin/placements";
import type { AdminActionState } from "@/server/actions/admin/seekers";

import { ActionFeedback } from "./action-feedback";

type Values = {
  contractDate: string;
  monthlyWage: number | "";
  feeAmount: number | "";
  feeStatus: string;
};

function Fields({ prefix, values }: { prefix: string; values: Values }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <div className="grid gap-1.5">
        <Label htmlFor={`${prefix}-date`}>계약일</Label>
        <Input
          id={`${prefix}-date`}
          type="date"
          name="contractDate"
          required
          defaultValue={values.contractDate}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${prefix}-wage`}>월 급여(원)</Label>
        <Input
          id={`${prefix}-wage`}
          type="number"
          inputMode="numeric"
          min={0}
          name="monthlyWage"
          required
          defaultValue={values.monthlyWage}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${prefix}-fee`}>소개요금(원)</Label>
        <Input
          id={`${prefix}-fee`}
          type="number"
          inputMode="numeric"
          min={0}
          name="feeAmount"
          required
          defaultValue={values.feeAmount}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${prefix}-status`}>요금 상태</Label>
        <NativeSelect id={`${prefix}-status`} name="feeStatus" defaultValue={values.feeStatus}>
          {FEE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {FEE_STATUS_LABEL[s]}
            </option>
          ))}
        </NativeSelect>
      </div>
    </div>
  );
}

/** 계약 등록 (R-216): one placement per recommendation. 소개요금은 기업 청구분(구직자 이용료 없음, BR-10). */
export function PlacementCreateForm({
  recommendations,
  today,
}: {
  recommendations: { id: string; label: string }[];
  today: string;
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    createPlacementAction,
    null,
  );
  return (
    <form action={action} className="grid gap-4" data-testid="placement-create-form">
      <div className="grid gap-1.5">
        <Label htmlFor="placement-rec">추천 건</Label>
        <NativeSelect id="placement-rec" name="recommendationId" required defaultValue="">
          <option value="" disabled>
            추천 건을 고르세요
          </option>
          {recommendations.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </NativeSelect>
      </div>
      <Fields
        prefix="placement-new"
        values={{ contractDate: today, monthlyWage: "", feeAmount: "", feeStatus: "UNBILLED" }}
      />
      <div>
        <Button type="submit" size="sm" disabled={pending} data-testid="placement-create">
          계약 등록
        </Button>
      </div>
      <ActionFeedback state={state} />
    </form>
  );
}

export function PlacementEditForm({
  placementId,
  values,
}: {
  placementId: string;
  values: Values;
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    updatePlacementAction,
    null,
  );
  return (
    <form action={action} className="grid gap-3" data-testid="placement-edit-form">
      <input type="hidden" name="placementId" value={placementId} />
      <Fields prefix={`placement-${placementId}`} values={values} />
      <div>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          저장
        </Button>
      </div>
      <ActionFeedback state={state} />
    </form>
  );
}
