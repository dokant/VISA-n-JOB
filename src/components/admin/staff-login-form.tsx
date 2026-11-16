"use client";

import { useActionState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type AdminAuthState, signInStaff } from "@/server/actions/admin/auth";

import { adminErrorText } from "./admin-messages";

/** /admin/login — 직원 이메일·비밀번호 (R-118). 성공하면 2단계 인증 화면으로 이동한다. */
export function StaffLoginForm() {
  const [state, action, pending] = useActionState<AdminAuthState, FormData>(signInStaff, null);
  useEffect(() => {
    if (state?.ok) window.location.assign(state.redirectTo);
  }, [state]);
  return (
    <form action={action} className="grid gap-5.5" data-testid="staff-login-form">
      <div className="grid gap-1.75">
        <Label htmlFor="staff-email">이메일</Label>
        <Input id="staff-email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="grid gap-1.75">
        <Label htmlFor="staff-password">비밀번호</Label>
        <Input
          id="staff-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {state && !state.ok ? (
        <p role="alert" className="text-caption text-error-text" data-testid="auth-error">
          {adminErrorText(state.code)}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "확인 중…" : "로그인"}
      </Button>
    </form>
  );
}
