import { NextResponse } from "next/server";

import { db } from "@/lib/db";

// Checked on every call (container health check, deploy/docker-compose.yml).
export const dynamic = "force-dynamic";

/**
 * GET /api/health — liveness for the deployment (A-8, deploy/DEPLOY.md). 200 when the app answers
 * and the database accepts `SELECT 1`, otherwise 503. The body holds no version, host or error
 * detail (nothing about the environment is disclosed). Not cached.
 */
export async function GET() {
  // rbac: public — 상태 확인용, 개인정보·설정 값 없음 (배포 헬스체크)
  const headers = { "Cache-Control": "no-store" };
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" }, { headers });
  } catch {
    console.error(JSON.stringify({ level: "error", event: "health.db_unavailable" }));
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers });
  }
}
