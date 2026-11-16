import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminAuthCard } from "@/components/admin/admin-auth-card";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { TotpForm } from "@/components/admin/totp-form";
import { requireStaff } from "@/lib/admin/session";
import { ADMIN_2FA_VERIFY_PATH } from "@/lib/authGuard";
import { startTotpEnrollment } from "@/lib/authCredentials";

export const metadata: Metadata = { title: "2단계 인증 설정" };

/** 4글자씩 끊어 읽기 쉽게 표시한다. */
function groupKey(secret: string): string {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}

/**
 * R-118: 처음 로그인한 직원의 TOTP 등록. QR 라이브러리 없이(PLAN P1b-4) 수동 입력 키와
 * otpauth 주소를 보여 준다. 첫 코드가 맞으면 등록이 끝나고 세션이 2단계 인증 완료로 바뀐다.
 */
export default async function TotpSetupPage() {
  const actor = await requireStaff("pending2fa");
  if (actor.totpEnrolled) redirect(ADMIN_2FA_VERIFY_PATH);
  const enrollment = await startTotpEnrollment(actor.id);
  if (enrollment.status === "ENROLLED") redirect(ADMIN_2FA_VERIFY_PATH);

  return (
    <AdminAuthCard
      title="2단계 인증 설정"
      description="관리자 화면은 2단계 인증을 마친 직원만 쓸 수 있습니다. 인증 앱(Google Authenticator 등)에 아래 키를 추가한 뒤, 앱에 표시된 6자리 코드를 입력해 주세요."
    >
      <div className="grid gap-3 rounded-sm border border-n200 bg-n50 p-4">
        <p className="text-label text-n700">수동 입력 키</p>
        <code
          className="text-control font-semibold tracking-wider break-all text-navy"
          data-testid="totp-secret"
        >
          {groupKey(enrollment.secret)}
        </code>
        <p className="text-label text-n700">otpauth 주소</p>
        <code className="text-caption break-all text-n700" data-testid="totp-uri">
          {enrollment.otpauthUri}
        </code>
        <p className="text-caption text-n700">
          이 키는 다른 사람에게 보여 주지 마세요. 설정을 마치면 다시 표시되지 않습니다.
        </p>
      </div>
      <TotpForm submitLabel="설정 완료" />
      <SignOutButton />
    </AdminAuthCard>
  );
}
