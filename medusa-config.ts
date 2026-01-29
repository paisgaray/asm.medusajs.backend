import { ExternalModuleDeclaration, InputConfigModules, InternalModuleDeclaration } from '@medusajs/framework/types';
import { ContainerRegistrationKeys, defineConfig, loadEnv, Modules } from '@medusajs/framework/utils';
import fs from 'fs';
import path from 'path';

loadEnv(process.env.NODE_ENV || 'development', process.cwd());

const modules:
  | InputConfigModules
  | Record<string, boolean | Partial<InternalModuleDeclaration | ExternalModuleDeclaration>> = [];

const addLocalModuleIfExists = (relativePath: string) => {
  const fullPath = path.resolve(process.cwd(), relativePath);
  if (fs.existsSync(fullPath)) {
    modules.push({ resolve: fullPath });
  }
};

addLocalModuleIfExists('./src/modules/bundled-product');
addLocalModuleIfExists('./src/modules/wishlist');
addLocalModuleIfExists('./src/modules/newsletter');

// Módulo Algolia
const algoliaModulePath = path.resolve(process.cwd(), './src/modules/algolia');
if (fs.existsSync(algoliaModulePath)) {
  modules.push({
    resolve: './src/modules/algolia',
    options: {
      appId: process.env.ALGOLIA_APP_ID!,
      apiKey: process.env.ALGOLIA_API_KEY!,
      productIndexName: process.env.ALGOLIA_PRODUCT_INDEX_NAME!,
      regionalTagPrefixes: process.env.ALGOLIA_REGIONAL_TAG_PREFIXES
        ? process.env.ALGOLIA_REGIONAL_TAG_PREFIXES.split(',').map((p: string) => p.trim())
        : undefined,
      supportedLanguages: process.env.ALGOLIA_SUPPORTED_LANGUAGES
        ? process.env.ALGOLIA_SUPPORTED_LANGUAGES.split(',').map((l: string) => l.trim())
        : undefined,
      envPrefix: process.env.ALGOLIA_ENV_PREFIX || undefined,
    },
  });
}

// Módulos Redis (caching, event-bus, workflow, locking)
const redisUrl = process.env.REDIS_URL || process.env.EVENTS_REDIS_URL || process.env.CACHE_REDIS_URL;

modules.push(
  {
    resolve: '@medusajs/medusa/caching',
    options: {
      providers: [
        {
          resolve: '@medusajs/caching-redis',
          id: 'caching-redis',
          is_default: true,
          options: {
            redisUrl: process.env.CACHE_REDIS_URL || redisUrl,
          },
        },
      ],
    },
  },
  {
    resolve: '@medusajs/medusa/event-bus-redis',
    options: {
      redisUrl: process.env.EVENTS_REDIS_URL || redisUrl,
    },
  },
  {
    resolve: '@medusajs/medusa/workflow-engine-redis',
    options: {
      redis: {
        redisUrl: process.env.WE_REDIS_URL || redisUrl,
      },
    },
  },
  {
    resolve: '@medusajs/medusa/locking',
    options: {
      providers: [
        {
          resolve: '@medusajs/medusa/locking-redis',
          id: 'locking-redis',
          is_default: true,
          options: {
            redisUrl: process.env.LOCKING_REDIS_URL || redisUrl,
          },
        },
      ],
    },
  },
  {
    resolve: './src/modules/region-zipcodes',
  },
  {
    resolve: '@medusajs/medusa/translation',
  },
  {
    resolve: '@medusajs/medusa/notification',
    options: {
      providers: [
        {
          resolve: '@medusajs/notification-sendgrid',
          id: 'sendgrid',
          options: {
            api_key: process.env.SENDGRID_API_KEY,
            from: process.env.SENDGRID_FROM_EMAIL,
          },
        },
      ],
    },
  },
);

if (process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY) {
  modules.push({
    resolve: '@medusajs/medusa/file',
    options: {
      providers: [
        {
          resolve: '@medusajs/medusa/file-s3',
          id: 's3',
          options: {
            file_url: process.env.S3_FILE_URL,
            access_key_id: process.env.S3_ACCESS_KEY_ID,
            secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
            region: process.env.S3_REGION,
            bucket: process.env.S3_BUCKET,
            endpoint: process.env.S3_ENDPOINT,
            additional_client_config: {
              forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
            },
          },
        },
      ],
    },
  });
}

// Módulo de Notificação com SendGrid (opcional - apenas se SENDGRID_FROM estiver configurado)
// Nota: Para salvar contatos no CRM, apenas SENDGRID_API_KEY é necessária
// O módulo de notificação só é necessário se você quiser enviar emails via SendGrid
if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM) {
  modules.push({
    resolve: '@medusajs/medusa/notification',
    options: {
      providers: [
        {
          resolve: '@medusajs/medusa/notification-sendgrid',
          id: 'sendgrid',
          options: {
            channels: ['email'],
            api_key: process.env.SENDGRID_API_KEY,
            from: process.env.SENDGRID_FROM,
          },
        },
      ],
    },
  });
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL) {
  modules.push({
    resolve: '@medusajs/medusa/auth',
    dependencies: [Modules.CACHE, ContainerRegistrationKeys.LOGGER],
    options: {
      providers: [
        {
          resolve: '@medusajs/medusa/auth-emailpass',
          id: 'emailpass',
        },
        {
          resolve: '@medusajs/medusa/auth-google',
          id: 'google',
          options: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackUrl: process.env.GOOGLE_CALLBACK_URL,
          },
        },
      ],
    },
  });
}

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL || redisUrl,
    http: {
      storeCors: process.env.STORE_CORS,
      adminCors: process.env.ADMIN_CORS,
      authCors: process.env.AUTH_CORS,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
    // Outras configs se necessário
  },
  admin: {
    backendUrl: process.env.MEDUSA_BACKEND_URL,
    disable: process.env.DISABLE_MEDUSA_ADMIN === 'true',
  },
  modules,
  featureFlags: {
    translation: true,
  },
});
