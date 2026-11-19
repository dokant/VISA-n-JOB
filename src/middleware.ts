import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";

import { REFERRAL_COOKIE_MAX_AGE_SEC } from "./config/limits";
import { readSessionClaims } from "./lib/authConfig";
import { decideAdminAccess, isAdminPath } from "./lib/authGuard";
import { publicUrl } from "./lib/publicOrigin";
import {
  REF_COOKIE,
  SRC_COOKIE,
  normalizeReferralCode,
  normalizeSourceChannel,
} from "./lib/seeker/referral";
import { routing } from "./i18n/routing";

/**
 * Middleware chain (PLAN P1b-4): session claims (Edge-safe, JWT claims only — no Prisma)
 * → `/admin/*` access decision (staff + 2FA, R-118) → next-intl locale routing for every other page.
 * Admin pages and server actions re-check the staff account in the database (defence in depth),
 * including whether the session was signed out (`sv`, integration QA I-1).
 *
 * I-1: the claims are only read, never refreshed. The middleware sends no session Set-Cookie, so a
 * response to a request that was still in flight at sign-out cannot restore the session cookie.
 */
const intl = createMiddleware(routing);

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

/**
 * O-9: an absolute redirect Location on the internal origin (the URL Next.js gives the middleware,
 * e.g. http://localhost:3000) is moved to the public origin. Other Locations are left alone.
 */
function toPublicLocation(request: NextRequest, response: NextResponse): void {
  const location = response.headers.get("location");
  if (!location) return;
  try {
    const target = new URL(location, request.url);
    if (target.origin !== new URL(request.url).origin) return;
    const moved = publicUrl(`${target.pathname}${target.search}${target.hash}`, request);
    if (moved.href !== target.href) response.headers.set("location", moved.href);
  } catch {
    // unparsable Location: keep it as it is
  }
}

export default async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  let response: NextResponse;
  if (isAdminPath(pathname)) {
    // /admin is Korean only and not localized (WO §12).
    const decision = decideAdminAccess(pathname, await readSessionClaims(request.headers));
    response =
      decision.action === "redirect"
        ? // O-9: public origin (AUTH_URL / SITE_URL / trusted proxy headers), not the internal one.
          NextResponse.redirect(publicUrl(decision.to, request))
        : NextResponse.next();
    response.headers.set("Cache-Control", "no-store");
  } else {
    response = intl(request);
    keepEntryParams(request, response);
    // O-9: a locale redirect (e.g. / → /ko) must not point at the internal server address either.
    toPublicLocation(request, response);
  }
  if (NOINDEX.test(pathname)) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  // Localized routes + /admin. Excluded: /api (Auth.js and route handlers check sessions
  // themselves), Next internals, files with an extension.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
