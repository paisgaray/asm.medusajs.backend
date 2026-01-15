# ==========================
# 1) BUILDER
# ==========================
FROM node:23-slim AS builder

# Instalamos o essencial para compilação de pacotes nativos
# Adicionado ca-certificates para evitar erros de SSL no download de pacotes
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/medusa

# --- AJUSTE YARN 4 ---
RUN corepack enable && corepack prepare yarn@4.6.0 --activate

# Copiamos os arquivos de configuração do Yarn PRIMEIRO
# É vital copiar a pasta .yarn para que o Yarn Berry funcione
COPY .yarn ./.yarn
COPY package.json yarn.lock* .yarnrc.yml ./

# Garante que o Yarn use node-modules (Medusa não suporta PnP nativamente bem)
RUN yarn config set nodeLinker node-modules

# Instalação das dependências (separado do build para usar cache do Docker)
RUN yarn install --frozen-lockfile

# Agora copiamos o restante do código
COPY . .

# Geramos o build (Certifique-se que o comando 'build' existe no seu package.json)
RUN yarn build

# ==========================
# 2) PRODUCTION IMAGE
# ==========================
FROM node:23-slim AS production

WORKDIR /app/medusa

RUN corepack enable && corepack prepare yarn@4.6.0 --activate

# Instalamos apenas o necessário para o runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# Copiamos apenas o necessário do builder
# Dica: Se o build gerar uma pasta 'dist' ou '.next', você pode copiar apenas elas 
# para economizar espaço, mas para Medusa, geralmente copiamos a pasta toda.
COPY --from=builder /app/medusa /app/medusa

# Garantir permissões
RUN chmod +x ./start.sh

EXPOSE 9000

ENTRYPOINT ["./start.sh"]
