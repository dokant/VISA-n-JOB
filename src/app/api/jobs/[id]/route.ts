import { type NextRequest, NextResponse } from "next/server";

import { isFeatureEnabled } from "@/config/flags";
import { getPublicPosting } from "@/lib/postings/public";

export const dynamic = "force-dynamic";

function notFound() {
  return NextResponse.json({ error: { code: "NOT_FOUND", message: "not found" } }, { status: 404 });
}

/**
 * GET /api/jobs/[id] — one public blind posting (R-202), serialized by publicPosting.ts. 404 when the
 * posting is not public (DRAFT, unverified, CLOSED, or its lead is not grade A — WO §15-3) and while
 * FEATURE_PUBLIC_JOBS is off (SC-07).
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // rbac: public — 블라인드 공고 상세는 비로그인 공개 정보 (WO §8.5, 플래그로 제어)
  if (!isFeatureEnabled("FEATURE_PUBLIC_JOBS")) return notFound();
  const { id } = await params;
  const posting = await getPublicPosting(id);
  return posting ? NextResponse.json({ posting }) : notFound();
}
