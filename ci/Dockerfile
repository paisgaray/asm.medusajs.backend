# ==========================
# 1) BUILDER
# ==========================
FROM node:23 AS builder

WORKDIR /app/medusa

COPY . .

# dependências necessárias para sharp / prisma / etc
RUN apt-get update && apt-get install -y python3 python3-pip python-is-python3

RUN yarn install --frozen-lockfile

RUN yarn build


# ==========================
# 2) PRODUCTION IMAGE
# ==========================
FROM node:23 AS production

WORKDIR /app/medusa

ENV NODE_ENV=production

# dependências necessárias somente para runtime
RUN apt-get update && apt-get install -y python3 python3-pip python-is-python3

# Copia resultado do build (JS, migrations, tudo dentro de .medusa)
COPY --from=builder /app/medusa/.medusa ./.medusa

WORKDIR /app/medusa/.medusa/server

# instala somente dependências do servidor compilado
RUN yarn install --production --frozen-lockfile

# Copia entrypoint
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

# Porta
EXPOSE 9000

ENTRYPOINT ["./start.sh"]
