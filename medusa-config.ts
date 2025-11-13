import { loadEnv, defineConfig } from '@medusajs/framework/utils';

loadEnv(process.env.NODE_ENV || 'development', process.cwd());

const buildDatabaseUrl = () => {
  const { DATABASE_URL, DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_FORCE_COMPONENTS } = process.env;

  const useComponentConfig = DB_FORCE_COMPONENTS !== 'false';

  const host = DB_HOST || 'localhost';
  const port = DB_PORT || '5432';
  const user = DB_USER || 'postgres';
  const password = DB_PASSWORD || 'postgres';
  const database = DB_NAME || 'medusa';

  if (!useComponentConfig && DATABASE_URL && DATABASE_URL.trim().length) {
    return DATABASE_URL;
  }

  const normalizedUrl = `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;

  process.env.DATABASE_URL = normalizedUrl;

  return normalizedUrl;
};

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: buildDatabaseUrl(),
    http: {
      storeCors: process.env.STORE_CORS || 'http://localhost:8000,http://localhost:5173',
      adminCors: process.env.ADMIN_CORS || 'http://localhost:7000,http://localhost:5173',
      authCors: process.env.AUTH_CORS || 'http://localhost:7000,http://localhost:5173',
      jwtSecret: process.env.JWT_SECRET || 'supersecret',
      cookieSecret: process.env.COOKIE_SECRET || 'supersecret',
    },
  },
  modules: [
    {
      resolve: './src/modules/bundled-product',
    },
    {
      resolve: './src/modules/wishlist',
    },
  ],
});
