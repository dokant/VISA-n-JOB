import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import { SERVER_ACTION_BODY_LIMIT } from "./src/config/limits";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // R-210: 소개 확인서 upload (INTRO_CONFIRM_MAX_BYTES + form fields) through a server action.
    serverActions: { bodySizeLimit: SERVER_ACTION_BODY_LIMIT },
  },
};

export default withNextIntl(nextConfig);
