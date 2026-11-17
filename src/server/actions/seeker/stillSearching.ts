"use server";

import { confirmStillSearching, type StillSearchingState } from "@/lib/seeker/stillSearching";

export type StillSearchingActionState =
  null | { ok: true } | { ok: false; state: Exclude<StillSearchingState, "ASK"> | "ERROR" };

/**
 * "네, 아직 찾고 있습니다" on /[locale]/seeker/still-searching/[token] (R-213 원클릭 응답).
 * The signed token from the status-check message is the only credential: it names one profile and
 * one open check, expires with the 14-day answer window and works once (src/lib/seeker/stillSearching.ts).
 */
export async function answerStillSearching(
  _prev: StillSearchingActionState,
  fd: FormData,
): Promise<StillSearchingActionState> {
  // rbac: public — 상태 확인 메시지의 서명 토큰이 권한(프로필 1건·열린 확인 1건·14일 만료·1회용), 로그인 없음 (R-213 원클릭)
  const token = fd.get("token");
  if (typeof token !== "string") return { ok: false, state: "INVALID" };
  try {
    const r = await confirmStillSearching(token);
    return r.ok ? { ok: true } : { ok: false, state: r.state };
  } catch {
    return { ok: false, state: "ERROR" };
  }
}
