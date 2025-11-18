#!/usr/bin/env sh
# Garante que o script pare em qualquer erro
set -e

echo "────────────────────────────────────────────────"
echo "  🚀 Medusa Backend - Script de Inicialização  🚀"
echo "────────────────────────────────────────────────"

# Definir diretório de trabalho para a raiz do projeto
cd /server

# ──────────────────────────────────────────────
# 1. Esperar pelo PostgreSQL (usando POSTGRES_HOST/PORT)
# ──────────────────────────────────────────────
if [ -n "$POSTGRES_HOST" ] && [ -n "$POSTGRES_PORT" ]; then
    echo "[DB] Aguardando PostgreSQL em ${POSTGRES_HOST}:${POSTGRES_PORT}..."
    # Loop de espera usando pg_isready para verificar a conexão na porta.
    until pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -q; do
        echo "[DB] PostgreSQL ainda indisponível. Esperando 2 segundos..."
        sleep 2
    done
    echo "[DB] PostgreSQL está OK e aceitando conexões."
else
    echo "[DB] Variáveis POSTGRES_HOST/POSTGRES_PORT não definidas; ignorando verificação de saúde."
fi

# ──────────────────────────────────────────────
# 2. Executar Migrações do Banco de Dados
# ──────────────────────────────────────────────
CLI_COMPILED="./.medusa/server/dist/cli.js"

echo "[Medusa] Executando migrações (db:migrate)..."
if [ -f "$CLI_COMPILED" ]; then
    # Usar o CLI compilado, se disponível
    node "$CLI_COMPILED" db:migrate
else
    # Fallback para npx medusa (usado em builds menores ou quando o CLI não está pré-compilado)
    npx medusa db:migrate
fi
echo "[Medusa] Migrações concluídas com sucesso."

# ──────────────────────────────────────────────
# 3. Informações Adicionais (Admin Check e Redis)
# ──────────────────────────────────────────────
ADMIN_INDEX="./.medusa/server/public/admin/index.html"
if [ -f "${ADMIN_INDEX}" ]; then
    echo "[Admin] Admin build OK em ${ADMIN_INDEX}"
else
    echo "[Admin] Admin build NÃO encontrado. Verifique o STAGE 1 (builder)."
fi

if [ -z "$REDIS_URL" ]; then
    echo "[Redis] REDIS_URL não definido. O Medusa usará uma instância falsa de Redis (NÃO recomendado para Produção)."
fi


# ──────────────────────────────────────────────
# 4. Iniciar Servidor Medusa
# ──────────────────────────────────────────────
echo "[Medusa] Iniciando servidor Medusa na porta ${PORT:-9000} com NODE_ENV=${NODE_ENV}..."

# 'exec' substitui o processo shell, que é uma prática recomendada no Docker.
exec npx medusa start