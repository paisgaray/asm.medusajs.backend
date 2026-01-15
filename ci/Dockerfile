# ==========================
# 1) BUILDER
# ==========================
FROM node:23-slim AS builder

# Instalamos o essencial apenas uma vez. 
# Imagem -slim reduz drasticamente o tempo de download e uso de disco.
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/medusa

# Copiamos apenas arquivos de dependências primeiro para aproveitar o cache do Docker
COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile

# Agora copiamos o código e geramos o build
COPY . .
RUN yarn build

# ==========================
# 2) PRODUCTION IMAGE
# ==========================
FROM node:23-slim AS production

WORKDIR /app/medusa

# Instalamos apenas o python3 para runtime (se necessário por algum plugin)
RUN apt-get update && apt-get install -y \
    python3 \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# Estratégia Medusa v2: 
# Em vez de tentar isolar a pasta .medusa/server, copiamos o projeto buildado.
# Isso garante que todos os binários do node_modules e scripts funcionem.
COPY --from=builder /app/medusa /app/medusa

# O Medusa v2 espera ser executado da raiz para encontrar o medusa-config.js
# Certifique-se que o seu start.sh está na raiz ou ajuste o caminho abaixo:
RUN chmod +x ./start.sh

EXPOSE 9000

ENTRYPOINT ["./start.sh"]
