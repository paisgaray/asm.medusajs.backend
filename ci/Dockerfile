# ==========================
# 1) BUILDER
# ==========================
FROM node:23-slim AS builder

# Instalamos o essencial para compilação de pacotes nativos
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/medusa

# --- AJUSTE YARN 4 ---
# Ativa o Corepack e prepara a versão específica do Yarn
RUN corepack enable && corepack prepare yarn@4.6.0 --activate

# Copiamos apenas arquivos de dependências
COPY package.json yarn.lock* ./
COPY .yarnrc.yml ./ 2>/dev/null || true

# Garante que o Yarn crie a pasta node_modules (necessário para o Medusa)
RUN yarn config set nodeLinker node-modules

# Instalação das dependências
RUN yarn install --frozen-lockfile

# Agora copiamos o código e geramos o build
COPY . .
RUN yarn build

# ==========================
# 2) PRODUCTION IMAGE
# ==========================
FROM node:23-slim AS production

WORKDIR /app/medusa

# Habilita Corepack na produção também para que os comandos 'yarn' funcionem
RUN corepack enable

# Instalamos apenas o python3 para runtime
RUN apt-get update && apt-get install -y \
    python3 \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# Copiamos o projeto buildado do builder
COPY --from=builder /app/medusa /app/medusa

# Permissão para o script de inicialização
RUN chmod +x ./start.sh

EXPOSE 9000

ENTRYPOINT ["./start.sh"]
