import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

/** 관리자 로그인·2FA 화면 공용 틀. */
export function AdminAuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main id="main" className="mx-auto grid min-h-dvh max-w-110 content-center px-gutter py-12">
      <Card className="grid gap-6">
        <div className="grid gap-2">
          <p className="text-label text-n500">VISA n JOB 관리자</p>
          <h1 className="text-h3 text-navy">{title}</h1>
          {description ? <div className="text-dense text-n700">{description}</div> : null}
        </div>
        {children}
      </Card>
    </main>
  );
}
