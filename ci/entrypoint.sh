#!/bin/sh
# Monta DATABASE_URL a partir de POSTGRES_* quando não estiver definida (ECS injeta POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, etc.)
# Uso no Dockerfile: ENTRYPOINT ["./entrypoint.sh"] e CMD ["node", "index.js"] (ou o comando do Medusa)

set -e

if [ -z "$DATABASE_URL" ] && [ -n "$POSTGRES_USER" ] && [ -n "$POSTGRES_PASSWORD" ] && [ -n "$POSTGRES_HOST" ]; then
  # Escapa caracteres especiais na senha para URL ( : @ / % )
  PASS_ESC=$(echo "$POSTGRES_PASSWORD" | sed -e 's/%/%25/g' -e 's/:/%3A/g' -e 's/@/%40/g' -e 's/\//%2F/g')
  PORT="${POSTGRES_PORT:-5432}"
  DB="${POSTGRES_DB:-medusa}"
  export DATABASE_URL="postgres://${POSTGRES_USER}:${PASS_ESC}@${POSTGRES_HOST}:${PORT}/${DB}"
fi

exec "$@"
