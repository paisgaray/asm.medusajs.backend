# ==========================
# 1) BUILDER
# ==========================
FROM node:23-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/medusa

# Ativa o Yarn 4
RUN corepack enable && corepack prepare yarn@4.6.0 --activate

# Copiamos as configurações do Yarn primeiro (com o truque do '*' para não falhar)
COPY .yarn* ./.yarn/
COPY package.json yarn.lock* .yarnrc.yml ./

# Garante que o Medusa use node_modules (essencial para compatibilidade)
RUN yarn config set nodeLinker node-modules

# Instalação das dependências
RUN yarn install --frozen-lockfile

# Agora copiamos o código e rodamos o build uma única vez
COPY . .
RUN yarn build

# ==========================
# 2) PRODUCTION IMAGE
# ==========================
FROM node:23-slim AS production

WORKDIR /app/medusa

# Habilita o Yarn 4 na produção também
RUN corepack enable && corepack prepare yarn@4.6.0 --activate

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# Copiamos o projeto pronto do builder
COPY --from=builder /app/medusa /app/medusa

# Garantir que o script de inicialização tenha permissão de execução
RUN chmod +x ./start.sh

EXPOSE 9000

ENTRYPOINT ["./start.sh"]
