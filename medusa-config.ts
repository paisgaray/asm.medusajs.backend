// medusa-config.ts
import fs from "fs"
import path from "path"
import { defineConfig, loadEnv } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "production", process.cwd())

const resolveIfExists = (name: string) => {
  const cwd = process.cwd()
  const candidates = [
    path.join(cwd, "src", "modules", name),                      // build
    path.join(cwd, ".medusa", "server", "src", "modules", name), // runtime
  ]
  const found = candidates.find((p) => fs.existsSync(p))
  return found ? { resolve: found } : null
}

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    databaseDriverOptions: { ssl: false, sslmode: "disable" },
    http: {
      storeCors:
        process.env.STORE_CORS ||
        "https://medusa-store-dev.quality.com.br,https://medusa-admin-dev.quality.com.br",
      adminCors:
        process.env.ADMIN_CORS || "https://medusa-admin-dev.quality.com.br",
      authCors:
        process.env.AUTH_CORS ||
        "https://medusa-admin-dev.quality.com.br,https://medusa-store-dev.quality.com.br",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
    workerMode:
      (process.env.MEDUSA_WORKER_MODE as "shared" | "server" | "worker") ||
      "shared",
    redisUrl: process.env.REDIS_URL,
  },

  modules: [
  resolveIfExists("bundled-product"),
  resolveIfExists("wishlist"),

  ...(process.env.REDIS_URL
    ? [
        {
          resolve: "@medusajs/medusa/caching",
          options: {
            providers: [
              {
                resolve: "@medusajs/caching-redis",
                id: "caching-redis",
                is_default: true,
                options: {
                  redisUrl: process.env.REDIS_URL,
                },
              },
            ],
          },
        },
        {
          resolve: "@medusajs/medusa/event-bus-redis",
          options: { redisUrl: process.env.REDIS_URL },
        },
        {
          resolve: "@medusajs/medusa/workflow-engine-redis",
          options: { redis: { url: process.env.REDIS_URL } },
        },
        {
          resolve: "@medusajs/medusa/locking",
          options: {
            providers: [
              {
                resolve: "@medusajs/medusa/locking-redis",
                id: "locking-redis",
                is_default: true,
                options: { redisUrl: process.env.REDIS_URL },
              },
            ],
          },
        },
      ]
    : []),


    // === Files (S3/MinIO) ===
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-s3",
            id: "s3",
            options: {
              file_url: process.env.S3_FILE_URL,
              access_key_id: process.env.S3_ACCESS_KEY_ID,
              secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
              region: process.env.S3_REGION,
              bucket: process.env.S3_BUCKET,
              endpoint: process.env.S3_ENDPOINT,
              additional_client_config: {
                forcePathStyle: true, // obrigatório pro MinIO
              },
            },
          },
        ],
      },
    },
  ],
})
