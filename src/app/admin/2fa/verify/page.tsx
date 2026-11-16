import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminAuthCard } from "@/components/admin/admin-auth-card";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { TotpForm } from "@/components/admin/totp-form";
import { requireStaff } from "@/lib/admin/session";
import { ADMIN_2FA_SETUP_PATH } from "@/lib/authGuard";

export const metadata: Metadata = { title: "2단계 인증" };

/** R-118: 비밀번호 로그인 뒤 TOTP 코드 확인. 통과 전에는 /admin/* 이 열리지 않는다. */
export default async function TotpVerifyPage() {
  const actor = await requireStaff("pending2fa");
  if (!actor.totpEnrolled) redirect(ADMIN_2FA_SETUP_PATH);
  return (
    <AdminAuthCard title="2단계 인증" description="인증 앱에 표시된 6자리 코드를 입력해 주세요.">
      <TotpForm submitLabel="확인" />
      <SignOutButton />
    </AdminAuthCard>
  );
}
