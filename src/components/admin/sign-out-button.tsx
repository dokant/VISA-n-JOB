import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOutStaff } from "@/server/actions/admin/auth";

/** 관리자 로그아웃. */
export function SignOutButton() {
  return (
    <form action={signOutStaff}>
      <Button type="submit" variant="outline" size="sm">
        <LogOut aria-hidden="true" strokeWidth={1.5} />
        로그아웃
      </Button>
    </form>
  );
}
