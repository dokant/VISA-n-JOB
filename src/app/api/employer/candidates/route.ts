import { type NextRequest, NextResponse } from "next/server";

import { isFeatureEnabled } from "@/config/flags";
import { candidateAccessOf } from "@/lib/candidates/access";
import { browseCandidates } from "@/lib/candidates/browse";
import { candidateStats } from "@/lib/candidates/stats";
import { type EmployerActor, requireEmployer } from "@/lib/employer/session";
import { AuthzError, assertCan } from "@/lib/rbac";
import { parseCandidateFilters } from "@/schemas/employer/candidates";

// Flag, session and data are read on every request (WO §16, SC-07).
export const dynamic = "force-dynamic";

function error(status: number, code: string, message: string, init?: ResponseInit) {
  return NextResponse.json({ error: { code, message } }, { status, ...init });
}

/**
 * GET /api/employer/candidates — blind candidates for a verified, contracted company (R-205), or
 * the summary counts for any other company (PC-11). Rows only through blindSeeker.ts (BR-02).
 * Each list response counts one view (daily cap, 429 after it — R-207) and writes
 * CANDIDATE_BULK_VIEW (PC-12). 404 while FEATURE_EMPLOYER_CANDIDATES is off (SC-07).
 * Listed in src/lib/employer/apiRegistry.ts (R-206 contact scan).
 */
export async function GET(request: NextRequest) {
  let actor: EmployerActor;
  try {
    actor = await requireEmployer(); // rbac: employer:selfService (signed-in employer)
    assertCan("EMPLOYER", "candidates:view");
  } catch (e) {
    if (!(e instanceof AuthzError)) throw e;
    // SC-07: while the flag is off the API does not exist, whoever asks.
    if (!isFeatureEnabled("FEATURE_EMPLOYER_CANDIDATES")) {
      return error(404, "NOT_FOUND", "not found");
    }
    return NextResponse.json(e.toBody(), { status: e.status });
  }
  if (!isFeatureEnabled("FEATURE_EMPLOYER_CANDIDATES")) return error(404, "NOT_FOUND", "not found");

  const access = await candidateAccessOf(actor.companyId);
  if (access.level !== "LIST") {
    return NextResponse.json({ access: "STATS", stats: await candidateStats() });
  }
  const r = await browseCandidates({
    actor,
    filters: parseCandidateFilters(request.nextUrl.searchParams),
  });
  if (!r.ok) {
    if (r.code === "RATE_LIMITED") {
      return error(429, "RATE_LIMITED", "daily candidate view limit reached", {
        headers: { "Retry-After": String(r.retryAfterSec) },
      });
    }
    return NextResponse.json({ access: "STATS", stats: await candidateStats() });
  }
  return NextResponse.json({ access: "LIST", candidates: r.candidates });
}
