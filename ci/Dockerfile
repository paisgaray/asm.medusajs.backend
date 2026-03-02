FROM node:22-slim AS base

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

ENV YARN_HOME="/yarn"
ENV PATH="$YARN_HOME:$PATH"

WORKDIR /app

FROM base AS prod-deps
COPY package.json yarn.lock .
RUN --mount=type=cache,id=yarn,target=/yarn/store yarn install --prod

FROM base AS build
COPY . .
RUN --mount=type=cache,id=yarn,target=/yarn/store yarn install
RUN yarn build

FROM base AS production

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/.medusa/server .
COPY --from=build /app/start.sh .
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/src/scripts/seed-zipcodes.ts ./src/scripts/seed-zipcodes.ts
COPY --from=build /app/src/scripts/zip_codes.json ./src/scripts/zip_codes.json
RUN chmod +x /app/start.sh

EXPOSE 9000

ENTRYPOINT ["./start.sh"]
CMD ["yarn", "start"]
