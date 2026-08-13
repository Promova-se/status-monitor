#!/usr/bin/env bash
# Backup diario do banco SQLite. Agende no cron:
#   0 3 * * *  /opt/status/deploy/backup.sh
set -euo pipefail

APP_DIR="/opt/status"
DB="$APP_DIR/prisma/dev.db"
DEST="$APP_DIR/backups"
KEEP_DAYS=14

mkdir -p "$DEST"
STAMP=$(date +%Y%m%d-%H%M%S)

# .backup garante uma copia consistente mesmo com o app rodando.
sqlite3 "$DB" ".backup '$DEST/status-$STAMP.db'"

# Remove backups com mais de KEEP_DAYS dias.
find "$DEST" -name 'status-*.db' -mtime +$KEEP_DAYS -delete

echo "Backup criado: $DEST/status-$STAMP.db"
