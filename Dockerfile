# syntax=docker/dockerfile:1
#
# Visa&Job production image (A-8, DECISIONS Q-30). One image, several commands
# (deploy/docker-entrypoint.sh):
#   app      next start on 0.0.0.0:3000 (behind Caddy, deploy/Caddyfile)
#   worker   pg-boss worker (scripts/worker.ts)
#   migrate  prisma migrate deploy (runs once before app and worker)
#   seed     reference data + the first admin account (prisma/seed, run by a person)
#
# The image holds production dependencies only: no embedded-postgres (DATABASE_URL is required),
# no Playwright, Vitest, ESLint or Lighthouse. Build: see deploy/DEPLOY.md (`docker compose build`).

ARG NODE_IMAGE=node:24-bookworm-slim

# ---------------------------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NEXT_TELEMETRY_DISABLED=1
# openssl: Prisma engine detection; ca-certificates: TLS to the managed database and Google Fonts.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

# ---------------------------------------------------------------------------------------------
# All dependencies (build tools included) for `next build`.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
# `prepare` runs husky (git hooks, development only); there is no git repository in the image.
RUN node -e "const f='package.json',p=require('./'+f);delete p.scripts.prepare;require('fs').writeFileSync(f,JSON.stringify(p,null,2))" \
 && pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------------------------
FROM deps AS build
COPY . .
# Values baked into statically rendered pages (canonical / hreflang / JSON-LD, operator info,
# flag-dependent links). Changing any of them later needs a rebuild (deploy/DEPLOY.md).
ARG SITE_URL
ARG SITE_BRAND_WORDMARK=
ARG SITE_BRAND_NAME_KO=
ARG SITE_BRAND_TAGLINE=
ARG SITE_ADMIN_SCRIVENER_OFFICE_NAME=
ARG SITE_BUSINESS_REG_NO=
ARG SITE_ADMIN_SCRIVENER_REG_NO=
ARG SITE_JOB_PLACEMENT_NAME=
ARG SITE_JOB_PLACEMENT_REG_NO=
ARG SITE_REPRESENTATIVE=
ARG SITE_ADDRESS=
ARG SITE_PHONE=
ARG SITE_EMAIL=
ARG FEATURE_DEMAND_MAP=false
ARG FEATURE_PUBLIC_JOBS=false
ARG FEATURE_REFERRAL_REWARD=false
ARG FEATURE_EMPLOYER_CANDIDATES=false
RUN test -n "$SITE_URL" || { echo "build arg SITE_URL is required" >&2; exit 1; }
# package.json from the context still has `prepare`; it is not run by `next build`.
RUN SITE_URL="$SITE_URL" \
    SITE_BRAND_WORDMARK="$SITE_BRAND_WORDMARK" SITE_BRAND_NAME_KO="$SITE_BRAND_NAME_KO" \
    SITE_BRAND_TAGLINE="$SITE_BRAND_TAGLINE" \
    SITE_ADMIN_SCRIVENER_OFFICE_NAME="$SITE_ADMIN_SCRIVENER_OFFICE_NAME" \
    SITE_BUSINESS_REG_NO="$SITE_BUSINESS_REG_NO" SITE_ADMIN_SCRIVENER_REG_NO="$SITE_ADMIN_SCRIVENER_REG_NO" \
    SITE_JOB_PLACEMENT_NAME="$SITE_JOB_PLACEMENT_NAME" SITE_JOB_PLACEMENT_REG_NO="$SITE_JOB_PLACEMENT_REG_NO" \
    SITE_REPRESENTATIVE="$SITE_REPRESENTATIVE" SITE_ADDRESS="$SITE_ADDRESS" \
    SITE_PHONE="$SITE_PHONE" SITE_EMAIL="$SITE_EMAIL" \
    FEATURE_DEMAND_MAP="$FEATURE_DEMAND_MAP" FEATURE_PUBLIC_JOBS="$FEATURE_PUBLIC_JOBS" \
    FEATURE_REFERRAL_REWARD="$FEATURE_REFERRAL_REWARD" \
    FEATURE_EMPLOYER_CANDIDATES="$FEATURE_EMPLOYER_CANDIDATES" \
    pnpm build \
 && rm -rf .next/cache

# ---------------------------------------------------------------------------------------------
# Production dependencies only (prisma CLI, tsx and typescript are runtime dependencies:
# migrations, the worker, the seed and next.config.ts need them; embedded-postgres is dev only).
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
RUN node -e "const f='package.json',p=require('./'+f);delete p.scripts.prepare;require('fs').writeFileSync(f,JSON.stringify(p,null,2))" \
 && pnpm install --frozen-lockfile --prod \
 && test ! -e node_modules/embedded-postgres \
 && test ! -e node_modules/@playwright/test \
 && test ! -e node_modules/vitest

# ---------------------------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    PRIVATE_STORAGE_DIR=/data/private
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/package.json /app/next.config.ts /app/tsconfig.json ./
COPY --from=build /app/public ./public
COPY --from=build /app/src ./src
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/content ./content
COPY --from=build /app/messages ./messages
COPY deploy/docker-entrypoint.sh /usr/local/bin/visanjob
# Private uploads (R-210) live on a volume mounted here (deploy/docker-compose.yml, app only).
RUN chmod 0755 /usr/local/bin/visanjob \
 && mkdir -p /data/private \
 && chown node:node /data/private \
 && chmod 0700 /data/private
USER node
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/visanjob"]
CMD ["app"]
