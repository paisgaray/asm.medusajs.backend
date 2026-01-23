import { Migration } from '@medusajs/framework/mikro-orm/migrations';

/**
 * Migration para tabelas de proteção Algolia usando apenas PostgreSQL
 *
 * Tabelas criadas:
 * - algolia_lock: Locks distribuídos usando SELECT FOR UPDATE
 * - algolia_idempotency: Idempotência global
 * - algolia_rate_limit: Rate limiting por idioma
 */
export class Migration20250115000000 extends Migration {
  override async up(): Promise<void> {
    // Tabela de locks distribuídos
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "algolia_lock" (
        "id" text NOT NULL,
        "lock_key" text NOT NULL,
        "owner_id" text NOT NULL,
        "acquired_at" timestamptz NOT NULL DEFAULT now(),
        "expires_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "algolia_lock_pkey" PRIMARY KEY ("id")
      );
    `);

    // ⚠️ Índice único sem WHERE (limpeza é feita na aplicação antes de inserir)
    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_algolia_lock_key" 
      ON "algolia_lock" ("lock_key");
    `);

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_algolia_lock_expires_at" 
      ON "algolia_lock" ("expires_at");
    `);

    // Tabela de idempotência
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "algolia_idempotency" (
        "id" text NOT NULL,
        "operation" text NOT NULL,
        "product_id" text NOT NULL,
        "language" text NOT NULL,
        "executed_at" timestamptz NOT NULL DEFAULT now(),
        "expires_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "algolia_idempotency_pkey" PRIMARY KEY ("id")
      );
    `);

    // ⚠️ Índice único sem WHERE (limpeza é feita na aplicação antes de inserir)
    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_algolia_idempotency_key" 
      ON "algolia_idempotency" ("operation", "product_id", "language");
    `);

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_algolia_idempotency_expires_at" 
      ON "algolia_idempotency" ("expires_at");
    `);

    // Tabela de rate limit
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "algolia_rate_limit" (
        "id" text NOT NULL,
        "rate_key" text NOT NULL,
        "tokens" integer NOT NULL DEFAULT 1,
        "last_refill" timestamptz NOT NULL DEFAULT now(),
        "window_start" timestamptz NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "algolia_rate_limit_pkey" PRIMARY KEY ("id")
      );
    `);

    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_algolia_rate_limit_key" 
      ON "algolia_rate_limit" ("rate_key");
    `);

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_algolia_rate_limit_expires_at" 
      ON "algolia_rate_limit" ("expires_at");
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "algolia_rate_limit" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "algolia_idempotency" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "algolia_lock" CASCADE;`);
  }
}
