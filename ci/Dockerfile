# ──────────────────────────────────────────────
# STAGE 1 — Build com Yarn Berry (node_modules + .medusa)
# ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /server

# **CORREÇÃO CRÍTICA 1:**
# Define NODE_ENV=development para garantir que as devDependencies
# (necessárias para o 'yarn build') sejam instaladas, mesmo que o Coolify
# tente injetar 'production' como um argumento de build.
ENV NODE_ENV=development

# Dependências para compilar módulos nativos
RUN apk add --no-cache python3 make g++

# Yarn Berry metadata
COPY package.json yarn.lock .yarnrc.yml ./
# Se .yarn não está versionada, NÃO copie:
# COPY .yarn ./.yarn

# Instala dependências (inclui dev, para garantir CLI / npx medusa)
RUN corepack enable && yarn install

# Código fonte
COPY . .

# Build (gera .medusa/server, etc.)
RUN yarn build

# Normaliza EOL e permissão do start.sh
RUN sed -i 's/\r$//' /server/start.sh && chmod +x /server/start.sh


# ──────────────────────────────────────────────
# STAGE 2 — Produção
# ──────────────────────────────────────────────
FROM node:20-alpine AS production

# libs de runtime
RUN apk add --no-cache \
  curl \
  postgresql-client \
  ca-certificates \
  netcat-openbsd

# Usuário não-root
RUN addgroup -S nodejs && adduser -S medusa -G nodejs

WORKDIR /server

# Copia artefatos de build e runtime
COPY --from=builder --chown=medusa:nodejs /server/.medusa /server/.medusa
COPY --from=builder --chown=medusa:nodejs /server/node_modules /server/node_modules
COPY --from=builder --chown=medusa:nodejs /server/package.json /server/package.json
COPY --from=builder --chown=medusa:nodejs /server/yarn.lock /server/yarn.lock
COPY --from=builder --chown=medusa:nodejs /server/.yarnrc.yml /server/.yarnrc.yml
COPY --from=builder --chown=medusa:nodejs /server/start.sh /server/start.sh
COPY --from=builder --chown=medusa:nodejs /server/medusa-config.* /server/
COPY --from=builder --chown=medusa:nodejs /server/tsconfig.json /server/
COPY --from=builder --chown=medusa:nodejs /server/src /server/src

RUN chmod +x /server/start.sh

USER medusa

ENV NODE_ENV=production
ENV PORT=9000

EXPOSE 9000

# **CORREÇÃO CRÍTICA 2:**
# Aumentado o start-period de 5s para 30s. Isso é essencial para dar tempo
# ao 'start.sh' executar o 'db:migrate' e ao Medusa iniciar o servidor.
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:${PORT:-9000}/health || exit 1

CMD ["/server/start.sh"]