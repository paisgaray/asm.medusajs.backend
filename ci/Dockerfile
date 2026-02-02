FROM node:22-slim AS base

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

ENV YARN_HOME="/yarn"
ENV PATH="$YARN_HOME:$PATH"

WORKDIR /app

FROM base AS prod-deps
COPY package.json yarn.lock .
RUN --mount=type=cache,id=yarn,target=/yarn/store,sharing=locked yarn install --prod --frozen-lockfile

FROM base AS build
COPY . .
RUN --mount=type=cache,id=yarn,target=/yarn/store,sharing=locked yarn install --frozen-lockfile
RUN yarn build

FROM base AS production

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/.medusa/server .
COPY --from=prod-deps /app/node_modules ./node_modules

EXPOSE 9000

ENTRYPOINT ["./start.sh"]
CMD ["yarn", "start"]
