import { NextResponse } from "next/server";

import { isFeatureEnabled } from "@/config/flags";
import { listPublicPostings } from "@/lib/postings/public";

// Flag and data are read on every request (WO §16, SC-07).
export const dynamic = "force-dynamic";

/**
 * GET /api/jobs — public blind postings (R-202). PUBLISHED + verified postings of grade-A leads only
 * (src/lib/postings/public.ts), each serialized by publicPosting.ts (WO §8.5 keys only, BR-03).
 * 404 while FEATURE_PUBLIC_JOBS is off (SC-07).
 */
export async function GET() {
  // rbac: public — 블라인드 공고 목록은 비로그인 공개 정보 (WO §8.5, 플래그로 제어)
  if (!isFeatureEnabled("FEATURE_PUBLIC_JOBS")) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "not found" } },
      { status: 404 },
    );
  }
  return NextResponse.json({ postings: await listPublicPostings() });
}
