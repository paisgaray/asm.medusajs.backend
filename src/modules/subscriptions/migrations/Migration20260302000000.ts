import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260302000000 extends Migration {
  override async up(): Promise<void> {
    // Add frequency column
    this.addSql(`
      ALTER TABLE "subscription"
        ADD COLUMN IF NOT EXISTS "frequency" text
          CHECK ("frequency" IN ('weekly', 'biweekly', 'monthly'))
          NOT NULL DEFAULT 'monthly';
    `);

    // Add period column (nullable)
    this.addSql(`
      ALTER TABLE "subscription"
        ADD COLUMN IF NOT EXISTS "period" text
          CHECK ("period" IN ('morning', 'afternoon', 'evening') OR "period" IS NULL);
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "subscription" DROP COLUMN IF EXISTS "period";`);
    this.addSql(`ALTER TABLE "subscription" DROP COLUMN IF EXISTS "frequency";`);
  }
}
