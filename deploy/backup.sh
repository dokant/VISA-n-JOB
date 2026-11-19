#!/bin/sh
# Daily backups (DECISIONS Q-31, deploy/docker-compose.yml service `backup`, deploy/DEPLOY.md).
#   loop   (default) every hour: make today's set if it does not exist yet, then prune
#   once   make a set now (also when today's exists: the file name has the time), then prune
#
# A set is
#   /backups/db/db-YYYY-MM-DD_HHMM.dump              pg_dump -Fc of DATABASE_URL
#   /backups/files/private-files-YYYY-MM-DD_HHMM.tar.gz   the private uploads (R-210, read-only)
# Both contain personal data: folders 0700, files 0600, owned by root. The newest BACKUP_KEEP of
# each kind are kept (default 14). Logs are JSON lines without values (no URL, no password).
set -eu

ROOT=/backups
KEEP="${BACKUP_KEEP:-14}"
umask 077

log() {
  # $1 level, $2 event, $3 optional file name (never a secret)
  if [ -n "${3:-}" ]; then
    printf '{"level":"%s","event":"%s","file":"%s"}\n' "$1" "$2" "$3" >&2
  else
    printf '{"level":"%s","event":"%s"}\n' "$1" "$2" >&2
  fi
}

case "$KEEP" in
  '' | *[!0-9]* | 0) log error backup.keep_invalid; exit 2 ;;
esac

if [ -z "${DATABASE_URL:-}" ]; then
  log error backup.database_url_missing
  exit 2
fi

# libpq does not accept Prisma's own URL parameters (schema, connection_limit, ...): connect with
# the URL before "?" and pass sslmode, when given, as PGSSLMODE.
DB_URI="${DATABASE_URL%%\?*}"
case "$DATABASE_URL" in
  *sslmode=*)
    mode="${DATABASE_URL#*sslmode=}"
    PGSSLMODE="${mode%%&*}"
    export PGSSLMODE
    ;;
esac

prune() {
  # $1 folder, $2 file prefix: keep the newest $KEEP files (names sort by date and time)
  ls -1 "$1" 2>/dev/null | grep "^$2" | sort -r | tail -n +"$((KEEP + 1))" | while read -r old; do
    rm -f "$1/$old"
    log info backup.pruned "$old"
  done
}

make_set() {
  stamp="$(date +%Y-%m-%d_%H%M)"
  mkdir -p "$ROOT/db" "$ROOT/files"
  chmod 0700 "$ROOT" "$ROOT/db" "$ROOT/files"

  db_file="db-$stamp.dump"
  if pg_dump --format=custom --no-password --dbname="$DB_URI" --file="$ROOT/db/.$db_file.part"; then
    chmod 0600 "$ROOT/db/.$db_file.part"
    mv "$ROOT/db/.$db_file.part" "$ROOT/db/$db_file"
    log info backup.db_done "$db_file"
  else
    rm -f "$ROOT/db/.$db_file.part"
    log error backup.db_failed
    return 1
  fi

  files_file="private-files-$stamp.tar.gz"
  if tar -czf "$ROOT/files/.$files_file.part" -C /private .; then
    chmod 0600 "$ROOT/files/.$files_file.part"
    mv "$ROOT/files/.$files_file.part" "$ROOT/files/$files_file"
    log info backup.files_done "$files_file"
  else
    rm -f "$ROOT/files/.$files_file.part"
    log error backup.files_failed
    return 1
  fi

  prune "$ROOT/db" "db-"
  prune "$ROOT/files" "private-files-"
}

today_done() {
  ls -1 "$ROOT/db" 2>/dev/null | grep -q "^db-$(date +%Y-%m-%d)_"
}

command="${1:-loop}"
case "$command" in
  once)
    make_set
    ;;
  loop)
    log info backup.started
    while :; do
      if ! today_done; then
        # A failure is logged and retried on the next hour.
        make_set || true
      fi
      sleep 3600
    done
    ;;
  *)
    log error backup.unknown_command
    exit 2
    ;;
esac
