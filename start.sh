#!/usr/bin/env sh
set -e

echo "[Medusa] start.sh iniciado"

# Espera pelo Postgres
PGHOST="${POSTGRES_HOST:-service_postgres}"
PGPORT="${POSTGRES_PORT:-5432}"
PGUSER="${POSTGRES_USER:-root}"

echo "[Medusa] Aguardando Postgres (${PGHOST}:${PGPORT}) via pg_isready..."
until pg_isready -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}"; do
  echo "[Medusa] Aguardando DB..."
  sleep 2
done
echo "[Medusa] Postgres OK!"

# Espera pelo MinIO
MINIO_HOST="${MINIO_HOST:-service_medusaminio}"
MINIO_PORT="${MINIO_PORT:-9100}"

echo "[Medusa] Aguardando MinIO (${MINIO_HOST}:${MINIO_PORT}) via nc..."
while ! nc -z "${MINIO_HOST}" "${MINIO_PORT}"; do
  echo "[Medusa] MinIO ainda não está disponível..."
  sleep 2
done
echo "[Medusa] MinIO OK!"


ADMIN_INDEX="/server/.medusa/server/public/admin/index.html"
if [ -f "${ADMIN_INDEX}" ]; then
  echo "[Medusa] Admin build OK em ${ADMIN_INDEX}"
else
  echo "[Medusa] Admin build NÃO encontrado em ${ADMIN_INDEX}"
  echo "[Medusa] Se não for servir o Admin pelo backend, defina admin.serve=false no medusa-config.ts"
fi

# Migrações (usa CLI compilado se existir; senão npx)
CLI_COMPILED="/server/.medusa/server/dist/cli.js"
if [ -f "${CLI_COMPILED}" ]; then
  echo "[Medusa] Executando migrações via CLI compilado..."
  node "${CLI_COMPILED}" db:migrate
else
  echo "[Medusa] CLI compilado não encontrado; usando npx medusa db:migrate..."
  npx medusa db:migrate
fi
echo "[Medusa] Migrações OK"

# Sobe o server a partir do build
cd /server/.medusa/server
echo "[Medusa] Iniciando servidor Medusa..."
exec npx medusa start
# (alternativa: exec npx medusa start)
