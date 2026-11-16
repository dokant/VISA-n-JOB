"use client";

import { useActionState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type AdminAuthState, verifyStaffTotpCode } from "@/server/actions/admin/auth";

import { adminErrorText } from "./admin-messages";

/** 2단계 인증 코드 입력 (R-118). 설정 화면과 확인 화면이 함께 쓴다. */
export function TotpForm({ submitLabel }: { submitLabel: string }) {
  const [state, action, pending] = useActionState<AdminAuthState, FormData>(
    verifyStaffTotpCode,
    null,
  );
  useEffect(() => {
    if (state?.ok) window.location.assign(state.redirectTo);
  }, [state]);
  return (
    <form action={action} className="grid gap-5.5" data-testid="totp-form">
      <div className="grid gap-1.75">
        <Label htmlFor="totp-code">
          인증 앱의 6자리 코드
          <span className="ms-1 font-normal text-n500">(필수)</span>
        </Label>
        <Input
          id="totp-code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          required
        />
      </div>
      {state && !state.ok ? (
        <p role="alert" className="text-caption text-error-text" data-testid="auth-error">
          {adminErrorText(state.code)}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "확인 중…" : submitLabel}
      </Button>
    </form>
  );
}
