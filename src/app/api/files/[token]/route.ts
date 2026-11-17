import { type NextRequest, NextResponse } from "next/server";

import { auditPiiView } from "@/lib/audit";
import { type StaffActor, requireStaffApi } from "@/lib/admin/session";
import { db } from "@/lib/db";
import { verifyFileToken } from "@/lib/files/signedUrl";
import { mimeOfKey, readStoredFile } from "@/lib/files/storage";
import { AuthzError } from "@/lib/rbac";

// Signed URLs are checked against the clock on every request.
export const dynamic = "force-dynamic";

function error(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * GET /api/files/{token} — private file download through a 5-minute signed URL (R-210, WO §11).
 * 1. rbac: staff with 2FA and `interview:manage` (소개 확인서는 매칭 담당·관리자 업무), else 401 / 403.
 * 2. token: HMAC signature, purpose and expiry (src/lib/files/signedUrl.ts) — expired, tampered or
 *    malformed → 403 (STANDARD 5 "403 만료 서명 URL"). The token must have been issued to the same
 *    staff member (403 otherwise).
 * 3. the key must still be the current 소개 확인서 of an interview (404 otherwise).
 * 4. PII_VIEW audit (field name only) — the file holds the seeker's name and signature.
 * Served as an attachment with no-store, nosniff and a sandbox CSP. Files live outside public/.
 */
export async function GET(_request: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  let actor: StaffActor;
  try {
    actor = await requireStaffApi("interview:manage"); // rbac: staff + 2FA + interview:manage
  } catch (e) {
    if (!(e instanceof AuthzError)) throw e;
    return NextResponse.json(e.toBody(), {
      status: e.status,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const { token } = await ctx.params;
  const verified = verifyFileToken(token);
  if (!verified.ok) return error(403, "FORBIDDEN", "the link is expired or invalid");
  const { payload } = verified;
  if (payload.u !== actor.id) return error(403, "FORBIDDEN", "the link was issued to another user");

  const interview = await db.interview.findFirst({
    where: { introConfirmFile: payload.k },
    select: { id: true },
  });
  const mime = mimeOfKey(payload.k);
  const bytes = interview && mime ? await readStoredFile(payload.k) : null;
  if (!interview || !mime || !bytes) return error(404, "NOT_FOUND", "not found");

  await auditPiiView({
    actorId: actor.id,
    entity: "Interview",
    entityId: interview.id,
    fields: ["introConfirmFile"],
  });
  const ext = payload.k.slice(payload.k.lastIndexOf(".") + 1);
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Length": String(bytes.length),
      "Content-Disposition": `attachment; filename="intro-confirm-${interview.id}.${ext}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'",
    },
  });
}
