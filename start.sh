#!/usr/bin/env sh
set -e

echo "[Medusa] start.sh iniciado"

cd /server

# ──────────────────────────────────────────────
# Espera pelo Postgres (opcional, guiado por env)
# ──────────────────────────────────────────────
PGHOST="${POSTGRES_HOST:-}"
PGPORT="${POSTGRES_PORT:-5432}"
PGUSER="${POSTGRES_USER:-postgres}"

if [ -n "$PGHOST" ]; then
  echo "[Medusa] Aguardando Postgres (${PGHOST}:${PGPORT}) via pg_isready..."
  until pg_isready -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}"; do
    echo "[Medusa] Aguardando DB..."
    sleep 2
  done
  echo "[Medusa] Postgres OK!"
else
  echo "[Medusa] POSTGRES_HOST não definido; pulando check de Postgres."
fi

# ──────────────────────────────────────────────
# Espera pelo MinIO (opcional, guiado por env)
# ──────────────────────────────────────────────
if [ -n "$MINIO_HOST" ] && [ -n "$MINIO_PORT" ]; then
  echo "[Medusa] Aguardando MinIO (${MINIO_HOST}:${MINIO_PORT}) via nc..."
  while ! nc -z "${MINIO_HOST}" "${MINIO_PORT}"; do
    echo "[Medusa] MinIO ainda não está disponível..."
    sleep 2
  done
  echo "[Medusa] MinIO OK!"
else
  echo "[Medusa] MINIO_HOST/MINIO_PORT não definidos; pulando check de MinIO."
fi

# ──────────────────────────────────────────────
# Verifica se existe Admin buildado (apenas log)
# ──────────────────────────────────────────────
ADMIN_INDEX="/server/.medusa/server/public/admin/index.html"
if [ -f "${ADMIN_INDEX}" ]; then
  echo "[Medusa] Admin build OK em ${ADMIN_INDEX}"
else
  echo "[Medusa] Admin build NÃO encontrado em ${ADMIN_INDEX}"
  echo "[Medusa] Se não for servir Admin pelo backend, defina admin.serve=false no medusa-config.*"
fi

# ──────────────────────────────────────────────
# Migrações de banco (prioriza CLI compilado)
# ──────────────────────────────────────────────
CLI_COMPILED="/server/.medusa/server/dist/cli.js"

if [ -f "${CLI_COMPILED}" ]; then
  echo "[Medusa] Executando migrações via CLI compilado..."
  node "${CLI_COMPILED}" db:migrate
else
  echo "[Medusa] CLI compilado não encontrado; usando npx medusa db:migrate..."
  npx medusa db:migrate
fi

echo "[Medusa] Migrações OK"

# ──────────────────────────────────────────────
# Sobe o servidor Medusa a partir do build
# ──────────────────────────────────────────────
cd /server/.medusa/server
echo "[Medusa] Iniciando servidor Medusa..."
exec npx medusa start
