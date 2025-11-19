#!/usr/bin/env sh
set -e

echo "────────────────────────────────────────────────"
echo "  🚀 Medusa Backend - Script de Inicialização  🚀"
echo "────────────────────────────────────────────────"

cd /server

# ──────────────────────────────────────────────
# 0. Validar DATABASE_URL
# ──────────────────────────────────────────────
if [ -z "$DATABASE_URL" ]; then
  echo "[ERRO] DATABASE_URL não definido. Abortando."
  exit 1
fi

echo "[INFO] DATABASE_URL recebido: $DATABASE_URL"

# ──────────────────────────────────────────────
# 1. Extrair dados do DATABASE_URL
#    Formato esperado: postgres://user:pass@host:port/dbname?params
# ──────────────────────────────────────────────

# remove o esquema (postgres://)
URL_NO_SCHEMA="${DATABASE_URL#*//}"      # user:pass@host:port/dbname?...

# user
DB_USER="${URL_NO_SCHEMA%%:*}"           # antes do primeiro ':'

# resto depois do user:
REST="${URL_NO_SCHEMA#*:}"               # pass@host:port/dbname?...

# senha (até o '@')
DB_PASS="${REST%%@*}"

# parte host:port/dbname?...
HOSTPORTDB="${URL_NO_SCHEMA#*@}"

# host (até ':')
DB_HOST_RAW="${HOSTPORTDB%%:*}"

# parte port/dbname?...
PORTDB="${HOSTPORTDB#*:}"

# porta (até '/')
DB_PORT_RAW="${PORTDB%%/*}"

# dbname + possivel query (?sslmode=...)
DB_NAME_WITH_QS="${PORTDB#*/}"

# remover query string do nome do banco
DB_NAME="${DB_NAME_WITH_QS%%\?*}"

# Permitir override por POSTGRES_HOST/PORT (Coolify injeta)
DB_HOST="${POSTGRES_HOST:-$DB_HOST_RAW}"
DB_PORT="${POSTGRES_PORT:-$DB_PORT_RAW}"

if [ -z "$DB_NAME" ]; then
  echo "[ERRO] Não foi possível extrair o nome do banco de DATABASE_URL."
  echo "       Verifique se a URL está no formato postgres://user:pass@host:port/dbname"
  exit 1
fi

export PGPASSWORD="$DB_PASS"
export PGCONNECT_TIMEOUT=10

echo "[INFO] Parsed:"
echo "       - DB_USER = $DB_USER"
echo "       - DB_HOST = $DB_HOST"
echo "       - DB_PORT = $DB_PORT"
echo "       - DB_NAME = $DB_NAME"

# ──────────────────────────────────────────────
# 2. Esperar PostgreSQL aceitar conexões TCP
# ──────────────────────────────────────────────
echo "[DB] Aguardando PostgreSQL em ${DB_HOST}:${DB_PORT}..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -q; do
  echo "[DB] PostgreSQL ainda indisponível. Esperando 3 segundos..."
  sleep 3
done
echo "[DB] PostgreSQL está OK e aceitando conexões."

# ──────────────────────────────────────────────
# 3. Garantir que o banco DB_NAME existe
#    - Tenta acessar diretamente $DATABASE_URL
#    - Se falhar, conecta no banco padrão 'postgres' e cria DB_NAME
# ──────────────────────────────────────────────
echo "[DB] Verificando se o banco '${DB_NAME}' existe..."

# Base sem nome de banco, para uso com /postgres
DB_BASE="postgres://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}"

if ! psql "$DATABASE_URL" -c "SELECT 1" >/dev/null 2>&1; then
  echo "[DB] Banco '${DB_NAME}' não existe ou não está acessível na URL informada."
  echo "[DB] Tentando criar usando banco padrão 'postgres' (${DB_BASE}/postgres)..."

  if ! psql "${DB_BASE}/postgres" -c "CREATE DATABASE \"${DB_NAME}\" OWNER \"${DB_USER}\";" >/dev/null 2>&1; then
    echo "[ERRO] Falha ao criar o banco '${DB_NAME}'."
    echo "       Verifique usuário/senha/permissões e se o usuário tem direito de CREATE DATABASE."
    exit 1
  fi

  echo "[DB] Banco '${DB_NAME}' criado com sucesso."
else
  echo "[DB] Banco '${DB_NAME}' já existe e está acessível."
fi

# ──────────────────────────────────────────────
# 4. Executar Migrações do Banco de Dados
# ──────────────────────────────────────────────
CLI_COMPILED="./.medusa/server/dist/cli.js"

echo "[Medusa] Executando migrações (db:migrate)..."
if [ -f "$CLI_COMPILED" ]; then
  node "$CLI_COMPILED" db:migrate || {
    echo "[ERRO] Migrações via CLI compilado falharam."
    exit 1
  }
else
  npx medusa db:migrate || {
    echo "[ERRO] Migrações via 'npx medusa db:migrate' falharam."
    exit 1
  }
fi
echo "[Medusa] Migrações concluídas com sucesso."

# ──────────────────────────────────────────────
# 5. Informações adicionais
# ──────────────────────────────────────────────
ADMIN_INDEX="./.medusa/server/public/admin/index.html"
if [ -f "${ADMIN_INDEX}" ]; then
  echo "[Admin] Admin build OK em ${ADMIN_INDEX}"
else
  echo "[Admin] Admin build NÃO encontrado. Verifique o build do Admin (STAGE 1)."
fi

if [ -z "$REDIS_URL" ]; then
  echo "[Redis] REDIS_URL não definido. O Medusa usará uma instância fake (NÃO recomendado em produção)."
fi

# Só para log (essas variáveis são usadas pelo próprio Medusa, não pelo script)
echo "[CORS] ADMIN_CORS = ${ADMIN_CORS:-<não definido>}"
echo "[CORS] AUTH_CORS  = ${AUTH_CORS:-<não definido>}"

# ──────────────────────────────────────────────
# 6. Iniciar servidor Medusa
# ──────────────────────────────────────────────
echo "[Medusa] Iniciando servidor Medusa na porta ${PORT:-9000} com NODE_ENV=${NODE_ENV:-production}..."
exec npx medusa start
