#!/bin/bash
# Daily PostgreSQL backup for ESG Sale CRM
# Run via systemd timer at 2:00 AM

BACKUP_DIR=/opt/ecosmart/backups
DATE=$(date +%Y%m%d_%H%M)
FILENAME="ecosmart_db_${DATE}.sql.gz"

mkdir -p "$BACKUP_DIR"
docker exec ecosmart-postgres pg_dump -U ecosmart ecosmart_db | gzip > "$BACKUP_DIR/$FILENAME"

if [ -s "$BACKUP_DIR/$FILENAME" ]; then
  echo "[$(date -Iseconds)] Backup OK: $FILENAME ($(du -h "$BACKUP_DIR/$FILENAME" | cut -f1))"
  # Rotate: keep last 30 days
  find "$BACKUP_DIR" -name '*.sql.gz' -mtime +30 -delete
else
  echo "[$(date -Iseconds)] ERROR: Backup failed or empty"
  exit 1
fi
