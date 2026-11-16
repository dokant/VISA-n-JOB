import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

/** R-130 / WO §13: areas that must never be indexed (header in addition to meta + robots.txt). */
const NOINDEX = /^\/(admin(\/|$)|[a-z]{2}\/employer\/candidates(\/|$))/;

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // /admin is Korean only and not localized (WO §12): no locale handling, only the noindex header.
  const response = pathname.startsWith("/admin") ? NextResponse.next() : intl(request);
  if (NOINDEX.test(pathname)) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  // Localized routes + /admin (header only). Excluded: /api, Next internals, files with an extension.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
