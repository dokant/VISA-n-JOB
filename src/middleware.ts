import { type NextRequest, NextResponse } from "next/server";
import NextAuth from "next-auth";
import createMiddleware from "next-intl/middleware";

import { REFERRAL_COOKIE_MAX_AGE_SEC } from "./config/limits";
import { authConfig } from "./lib/authConfig";
import { decideAdminAccess, isAdminPath } from "./lib/authGuard";
import {
  REF_COOKIE,
  SRC_COOKIE,
  normalizeReferralCode,
  normalizeSourceChannel,
} from "./lib/seeker/referral";
import { routing } from "./i18n/routing";

/**
 * Middleware chain (PLAN P1b-4): Auth.js session (Edge-safe config, JWT claims only — no Prisma)
 * → `/admin/*` access decision (staff + 2FA, R-118) → next-intl locale routing for every other page.
 * Admin pages and server actions re-check the staff account in the database (defence in depth).
 */
const intl = createMiddleware(routing);
const { auth } = NextAuth(authConfig);

/** R-130 / WO §13: areas that must never be indexed (header in addition to meta + robots.txt). */
const NOINDEX =
  /^\/(admin(\/|$)|[a-z]{2}\/(employer|seeker)\/(candidates|contract|login|signup|register|me|requests?|still-searching)(\/|$))/;

/**
 * R-111: `?ref=코드&src=채널` on any page is kept in cookies until the seeker registers
 * (src/lib/seeker/account.ts stores them as referredByCode / sourceChannel). Invalid values are
 * ignored; the cookies hold no personal data.
 */
function keepEntryParams(request: NextRequest, response: NextResponse): void {
  const ref = normalizeReferralCode(request.nextUrl.searchParams.get("ref"));
  const src = normalizeSourceChannel(request.nextUrl.searchParams.get("src"));
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: REFERRAL_COOKIE_MAX_AGE_SEC,
    secure: request.nextUrl.protocol === "https:",
  };
  if (ref) response.cookies.set(REF_COOKIE, ref, options);
  if (src) response.cookies.set(SRC_COOKIE, src, options);
}

export default auth((request) => {
  const { pathname } = request.nextUrl;
  let response: NextResponse;
  if (isAdminPath(pathname)) {
    // /admin is Korean only and not localized (WO §12).
    const decision = decideAdminAccess(pathname, request.auth?.user ?? null);
    response =
      decision.action === "redirect"
        ? NextResponse.redirect(new URL(decision.to, request.url))
        : NextResponse.next();
    response.headers.set("Cache-Control", "no-store");
  } else {
    response = intl(request);
    keepEntryParams(request, response);
  }
  if (NOINDEX.test(pathname)) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
});

export const config = {
  // Localized routes + /admin. Excluded: /api (Auth.js and route handlers check sessions
  // themselves), Next internals, files with an extension.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
