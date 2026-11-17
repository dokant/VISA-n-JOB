import { NextResponse } from "next/server";

import { loadEmployerRequests } from "@/lib/employer/interviews";
import { type EmployerActor, requireEmployer } from "@/lib/employer/session";
import { AuthzError } from "@/lib/rbac";

// Session and data are read on every request.
export const dynamic = "force-dynamic";

/**
 * GET /api/employer/requests — the signed-in company's 면접 요청 and arranged interviews (R-212).
 * Seekers appear by blind id only; the real name appears only inside a consented, confirmed interview
 * of this company (R-211, serializers/interviewDisclosure.ts). No contact ever (BR-01, R-206).
 * Listed in src/lib/employer/apiRegistry.ts (R-206 contact scan, name-disclosure rule).
 */
export async function GET() {
  let actor: EmployerActor;
  try {
    actor = await requireEmployer(); // rbac: employer:selfService (signed-in employer)
  } catch (e) {
    if (!(e instanceof AuthzError)) throw e;
    return NextResponse.json(e.toBody(), { status: e.status });
  }
  const data = await loadEmployerRequests(actor);
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
