#!/bin/sh
# Container entrypoint (A-8, Dockerfile). Usage: visanjob app|worker|migrate|seed|<command>
# Checks the required environment before starting; logs are JSON lines without values.
# Database rules (DECISIONS Q-31): host `db` (the compose PostgreSQL container) needs no sslmode
# and no CA; any other host should use sslmode=require and the CA file; the local embedded
# development ports are refused.
set -eu

BIN=/app/node_modules/.bin
missing=0

log() {
  # $1 level, $2 event, $3 optional name (never a value)
  if [ -n "${3:-}" ]; then
    printf '{"level":"%s","event":"%s","name":"%s"}\n' "$1" "$2" "$3" >&2
  else
    printf '{"level":"%s","event":"%s"}\n' "$1" "$2" >&2
  fi
}

require() {
  for name in "$@"; do
    eval "value=\${$name:-}"
    if [ -z "$value" ]; then
      log error config.missing "$name"
      missing=1
    fi
  done
}

# Host name of DATABASE_URL (no value is logged). "db" is the PostgreSQL container of the
# compose network (profile local-db, DECISIONS Q-31); anything else is an external database.
database_host() {
  rest="${DATABASE_URL#*://}"
  rest="${rest%%[/?]*}"
  rest="${rest##*@}"
  case "$rest" in
    \[*) rest="${rest%%]*}]" ;;
    *) rest="${rest%%:*}" ;;
  esac
  printf '%s' "$rest"
}

# The CA file of NODE_EXTRA_CA_CERTS is only placed for a managed database. When it is missing,
# drop the variable so Node does not warn on every start.
drop_missing_ca() {
  if [ -n "${NODE_EXTRA_CA_CERTS:-}" ] && [ ! -f "$NODE_EXTRA_CA_CERTS" ]; then
    unset NODE_EXTRA_CA_CERTS
    return 1
  fi
  return 0
}

check_database_url() {
  require DATABASE_URL
  [ -n "${DATABASE_URL:-}" ] || return 0
  case "$DATABASE_URL" in
    *127.0.0.1:5432[09]* | *localhost:5432[09]*)
      # 54320 / 54329 are the local embedded development and test clusters (README).
      log error config.embedded_database DATABASE_URL
      missing=1
      return 0
      ;;
  esac
  if [ "$(database_host)" = "db" ]; then
    # Internal compose network: the db container has no TLS, so no sslmode and no CA.
    case "$DATABASE_URL" in
      *sslmode=require* | *sslmode=verify-ca* | *sslmode=verify-full*)
        log error config.internal_database_tls DATABASE_URL
        missing=1
        ;;
    esac
    drop_missing_ca || true
  else
    # External (managed) database: TLS is expected and the worker verifies the certificate.
    case "$DATABASE_URL" in
      *sslmode=require* | *sslmode=verify-ca* | *sslmode=verify-full*) ;;
      *) log warn config.database_without_sslmode DATABASE_URL ;;
    esac
    if [ -z "${NODE_EXTRA_CA_CERTS:-}" ] || ! drop_missing_ca; then
      log warn config.database_ca_missing NODE_EXTRA_CA_CERTS
    fi
  fi
}

check_flags() {
  for flag in FEATURE_DEMAND_MAP FEATURE_PUBLIC_JOBS FEATURE_REFERRAL_REWARD FEATURE_EMPLOYER_CANDIDATES; do
    eval "value=\${$flag:-}"
    # A-5: flags stay off until the legal review is done. Only the exact value "true" turns one on.
    if [ "$value" = "true" ]; then log warn config.feature_flag_on "$flag"; fi
  done
}

command="${1:-app}"
case "$command" in
  app)
    check_database_url
    require AUTH_SECRET AUTH_URL ENCRYPTION_KEYS HASH_KEY SITE_URL
    if [ "${TRUST_PROXY:-}" != "true" ]; then log warn config.trust_proxy_off TRUST_PROXY; fi
    check_flags
    [ "$missing" -eq 0 ] || exit 1
    exec "$BIN/next" start --hostname 0.0.0.0 --port "${PORT:-3000}"
    ;;
  worker)
    check_database_url
    require ENCRYPTION_KEYS HASH_KEY SITE_URL
    [ "$missing" -eq 0 ] || exit 1
    exec "$BIN/tsx" scripts/worker.ts
    ;;
  migrate)
    check_database_url
    [ "$missing" -eq 0 ] || exit 1
    exec "$BIN/prisma" migrate deploy
    ;;
  seed)
    check_database_url
    [ "$missing" -eq 0 ] || exit 1
    exec "$BIN/tsx" prisma/seed/index.ts
    ;;
  *)
    exec "$@"
    ;;
esac
