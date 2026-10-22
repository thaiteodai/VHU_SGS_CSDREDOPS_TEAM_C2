#!/usr/bin/env bash
# Database backup and restore for Panic Plan.
#
#   ./scripts/backup.sh create              # write a timestamped dump
#   ./scripts/backup.sh create /path/dir    # ...into a specific directory
#   ./scripts/backup.sh list                # show available backups
#   ./scripts/backup.sh restore <file>      # restore a dump
#
# The connection comes from DATABASE_URL. Nothing here prints a password.

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATABASE_URL="${DATABASE_URL:-}"

red() { printf '\033[31m%s\033[0m\n' "$1"; }
green() { printf '\033[32m%s\033[0m\n' "$1"; }

require_db_url() {
  if [[ -z "$DATABASE_URL" ]]; then
    red "DATABASE_URL is not set. Copy server/.env.example to server/.env and edit it."
    exit 1
  fi
}

cmd_create() {
  require_db_url
  local dir="${1:-$BACKUP_DIR}"
  mkdir -p "$dir"
  local stamp
  stamp="$(date +%Y%m%d-%H%M%S)"
  local file="$dir/panicplan-$stamp.sql"
  echo "Dumping database to $file"
  pg_dump "$DATABASE_URL" --clean --if-exists --no-owner --no-privileges > "$file"
  gzip -f "$file"
  green "Backup written: $file.gz"
  echo "Restore with: ./scripts/backup.sh restore $file.gz"
}

cmd_list() {
  local dir="${1:-$BACKUP_DIR}"
  if [[ ! -d "$dir" ]]; then
    red "No backup directory at $dir"
    exit 1
  fi
  ls -lh "$dir"
}

cmd_restore() {
  require_db_url
  local file="${1:-}"
  if [[ -z "$file" || ! -f "$file" ]]; then
    red "Usage: ./scripts/backup.sh restore <backup-file>"
    exit 1
  fi
  echo "This will overwrite the current database. Type 'restore' to continue:"
  read -r answer
  if [[ "$answer" != "restore" ]]; then
    red "Aborted."
    exit 1
  fi
  if [[ "$file" == *.gz ]]; then
    gunzip -c "$file" | psql "$DATABASE_URL"
  else
    psql "$DATABASE_URL" -f "$file"
  fi
  green "Restore complete."
}

case "${1:-}" in
  create) cmd_create "${2:-}" ;;
  list) cmd_list "${2:-}" ;;
  restore) cmd_restore "${2:-}" ;;
  *)
    echo "Usage: $0 {create [dir]|list [dir]|restore <file>}"
    exit 1
    ;;
esac
