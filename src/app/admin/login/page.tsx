import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminAuthCard } from "@/components/admin/admin-auth-card";
import { StaffLoginForm } from "@/components/admin/staff-login-form";
import { hasVerifiedStaffSession } from "@/lib/admin/session";
import { ADMIN_HOME_PATH } from "@/lib/authGuard";

export const metadata: Metadata = { title: "직원 로그인" };

/**
 * R-118 1단계: 직원 이메일·비밀번호. 2단계 인증(TOTP)을 마쳐야 관리자 화면이 열린다.
 * I-1: 이미 2단계 인증까지 마친 유효한 세션이면 대시보드로 보낸다(로그아웃된 토큰은 auth()가 거부).
 */
export default async function AdminLoginPage() {
  if (await hasVerifiedStaffSession()) redirect(ADMIN_HOME_PATH);
  return (
    <AdminAuthCard
      title="직원 로그인"
      description="이메일과 비밀번호를 입력한 뒤 2단계 인증을 진행합니다."
    >
      <StaffLoginForm />
    </AdminAuthCard>
  );
}
