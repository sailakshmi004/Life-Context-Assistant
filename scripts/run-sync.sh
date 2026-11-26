#!/usr/bin/env bash
# Runs the notification/weather sync from cron every 10 minutes.
# Requires .env in the app directory with CRON_SECRET.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/awarely}"
ENV_FILE="$APP_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

# Read only the scheduler secret; avoid sourcing the whole env file in cron.
CRON_SECRET="$(sed -n 's/^CRON_SECRET=//p' "$ENV_FILE" | head -n 1 | tr -d '\r')"
CRON_SECRET="${CRON_SECRET%\"}"
CRON_SECRET="${CRON_SECRET#\"}"
CRON_SECRET="${CRON_SECRET%\'}"
CRON_SECRET="${CRON_SECRET#\'}"

if [ -z "$CRON_SECRET" ]; then
  echo "CRON_SECRET is missing from $ENV_FILE" >&2
  exit 1
fi

curl --max-time 120 \
  --retry 3 \
  --retry-delay 15 \
  --retry-connrefused \
  -fsS \
  -X POST \
  -H "x-cron-secret: ${CRON_SECRET}" \
  "http://127.0.0.1:3000/api/notifications/sync" >/dev/null

echo "sync ok $(date -u +%FT%TZ)"
