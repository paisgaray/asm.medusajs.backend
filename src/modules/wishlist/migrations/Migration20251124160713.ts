import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20251124160713 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`ALTER TABLE IF EXISTS "wishlist" ADD COLUMN IF NOT EXISTS "name" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE IF EXISTS "wishlist" DROP COLUMN IF EXISTS "name";`);
  }
}
