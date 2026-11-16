import type { Metadata } from "next";

import { AdminAuthCard } from "@/components/admin/admin-auth-card";
import { StaffLoginForm } from "@/components/admin/staff-login-form";

export const metadata: Metadata = { title: "직원 로그인" };

/** R-118 1단계: 직원 이메일·비밀번호. 2단계 인증(TOTP)을 마쳐야 관리자 화면이 열린다. */
export default function AdminLoginPage() {
  return (
    <AdminAuthCard
      title="직원 로그인"
      description="이메일과 비밀번호를 입력한 뒤 2단계 인증을 진행합니다."
    >
      <StaffLoginForm />
    </AdminAuthCard>
  );
}
