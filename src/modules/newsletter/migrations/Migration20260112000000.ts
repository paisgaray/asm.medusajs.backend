import { Migration } from '@mikro-orm/migrations';

export class Migration20260112000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "newsletter_subscriber" (
        "id" TEXT NOT NULL,
        "email" TEXT NOT NULL UNIQUE,
        "subscribed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "source" TEXT,
        "metadata" JSONB,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "newsletter_subscriber_pkey" PRIMARY KEY ("id")
      );
    `);

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_newsletter_subscriber_email" ON "newsletter_subscriber" ("email");
    `);

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_newsletter_subscriber_subscribed_at" ON "newsletter_subscriber" ("subscribed_at");
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "newsletter_subscriber" CASCADE;`);
  }
}
