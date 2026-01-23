import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260123130000 extends Migration {
  override async up(): Promise<void> {
    // Adicionar colunas faltantes se não existirem
    this.addSql(`
      ALTER TABLE "newsletter_subscriber" 
      ADD COLUMN IF NOT EXISTS "first_name" TEXT NULL,
      ADD COLUMN IF NOT EXISTS "last_name" TEXT NULL,
      ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'subscribed',
      ADD COLUMN IF NOT EXISTS "unsubscribed_at" TIMESTAMPTZ NULL;
    `);

    // Adicionar constraint de check para status
    this.addSql(`
      ALTER TABLE "newsletter_subscriber" 
      DROP CONSTRAINT IF EXISTS "newsletter_subscriber_status_check";
    `);

    this.addSql(`
      ALTER TABLE "newsletter_subscriber" 
      ADD CONSTRAINT "newsletter_subscriber_status_check" 
      CHECK ("status" IN ('subscribed', 'unsubscribed'));
    `);

    // Atualizar registros existentes para ter status 'subscribed'
    this.addSql(`
      UPDATE "newsletter_subscriber" 
      SET "status" = 'subscribed' 
      WHERE "status" IS NULL;
    `);

    // Tornar status NOT NULL
    this.addSql(`
      ALTER TABLE "newsletter_subscriber" 
      ALTER COLUMN "status" SET NOT NULL;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "newsletter_subscriber" 
      DROP COLUMN IF EXISTS "first_name",
      DROP COLUMN IF EXISTS "last_name",
      DROP COLUMN IF EXISTS "status",
      DROP COLUMN IF EXISTS "unsubscribed_at";
    `);
  }
}
