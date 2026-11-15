import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Localized routes only. Excluded: /admin (Korean only, WO §12), /api, Next internals, files with an extension.
  matcher: ["/((?!admin|api|_next|_vercel|.*\..*).*)"],
};
