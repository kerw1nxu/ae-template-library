#!/usr/bin/env bash
set -euo pipefail

SOURCE_DB="${DATABASE_PATH:-/var/lib/ae-template-site/db.sqlite}"
BACKUP_DIR="${BACKUP_DIR:-/mnt/ae-templates/backups/sqlite}"
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

if [ ! -f "$SOURCE_DB" ]; then
  echo "Database not found: $SOURCE_DB" >&2
  exit 1
fi

cp "$SOURCE_DB" "$BACKUP_DIR/db-$STAMP.sqlite"

find "$BACKUP_DIR" -type f -name 'db-*.sqlite' -mtime +14 -delete
