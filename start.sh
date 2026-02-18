#!/bin/bash
set -e

# Monta DATABASE_URL a partir de POSTGRES_* quando não estiver definida (ECS)
if [ -z "$DATABASE_URL" ] && [ -n "$POSTGRES_USER" ] && [ -n "$POSTGRES_PASSWORD" ] && [ -n "$POSTGRES_HOST" ]; then
  PASS_ESC=$(echo "$POSTGRES_PASSWORD" | sed -e 's/%/%25/g' -e 's/:/%3A/g' -e 's/@/%40/g' -e 's/\//%2F/g')
  PORT="${POSTGRES_PORT:-5432}"
  DB="${POSTGRES_DB:-medusa}"
  export DATABASE_URL="postgres://${POSTGRES_USER}:${PASS_ESC}@${POSTGRES_HOST}:${PORT}/${DB}"
fi

if [ "$WORKER_MODE" != "worker" ]; then
  echo "Running migrations for $WORKER_MODE"
  until yarn prestart; do
    echo "Migration failed — retrying in 5s..."
    sleep 5
  done
else
  echo "Skipping migrations because WORKER_MODE=worker"
fi

exec "$@"
