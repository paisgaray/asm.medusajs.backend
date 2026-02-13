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
addLocalModuleIfExists('./src/modules/subscriptions');
addLocalModuleIfExists('./src/modules/newsletter');
addLocalModuleIfExists('./src/modules/contact');

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
    resolve: '@medusajs/medusa/auth',
    dependencies: [Modules.CACHE, ContainerRegistrationKeys.LOGGER],
    options: {
      providers: [
        {
          resolve: '@medusajs/medusa/auth-emailpass',
          id: 'emailpass',
          options: {},
        },
      ],
    },
  },
  {
    resolve: '@medusajs/medusa/notification',
    options: {
      providers: [
        {
          resolve: '@medusajs/notification-sendgrid',
          id: 'sendgrid',
          options: {
            channels: ['email'],
            api_key: process.env.SENDGRID_API_KEY,
            from: process.env.SENDGRID_FROM_EMAIL || process.env.SENDGRID_FROM,
          },
        },
      ],
    },
  },
  {
    resolve: '@medusajs/medusa/payment',
    options: {
      providers: [
        {
          resolve: '@medusajs/medusa/payment-stripe',
          id: 'stripe',
          options: {
            apiKey: process.env.STRIPE_API_KEY,
            // Automatically create Stripe customers and attach payment methods during checkout
            // This is required for subscriptions to reuse payment methods
            // automatic_payment_methods: true,
            // payment_intent_data: {
            //   setup_future_usage: 'off_session',
            // },
          },
        },
      ],
    },
  },
);

// File Module: SEMPRE registrar (S3 se configurado, senão local)
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
} else {
  // File provider local para desenvolvimento (SEMPRE registrar se não houver S3)
  // Conforme documentação: https://docs.medusajs.com/resources/modules/file
  modules.push({
    resolve: '@medusajs/medusa/file',
    options: {
      providers: [
        {
          resolve: '@medusajs/medusa/file-local',
          id: 'local',
          options: {
            // Opções opcionais em dev - o provider local usa uploads/ por padrão
          },
        },
      ],
    },
  });
}

// Log para verificar se File Module está sendo registrado
const hasFileModule = modules.some((m) => {
  if (typeof m === 'object' && m !== null && 'resolve' in m) {
    return (m as { resolve?: string }).resolve === '@medusajs/medusa/file';
  }
  return false;
});
if (hasFileModule) {
  console.log('[medusa-config] ✅ File Module registrado no array de modules');
} else {
  console.warn('[medusa-config] ⚠️ File Module NÃO encontrado no array de modules!');
  console.log('[medusa-config] Total de módulos:', modules.length);
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
